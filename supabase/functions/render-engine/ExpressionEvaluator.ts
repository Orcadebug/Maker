// ============================================================================
// ExpressionEvaluator - Safe server-side expression evaluator
// Uses a recursive descent parser. No eval() or Function().
// ============================================================================

import { EXPR_PREFIX } from '../shared/types.ts';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

enum TokenType {
  Number,
  String,
  Boolean,
  Null,
  Identifier,
  Dot,
  LBracket,
  RBracket,
  LParen,
  RParen,
  Comma,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  And,
  Or,
  Not,
  Eq,          // ===
  NotEq,       // !==
  EqLoose,     // ==
  NotEqLoose,  // !=
  Lt,
  Gt,
  Lte,
  Gte,
  Question,
  Colon,
  Arrow,       // =>
  TemplateString,
  EOF,
}

interface Token {
  type: TokenType;
  value: any;
  pos: number;
}

// ---------------------------------------------------------------------------
// Allowed safe methods (whitelist)
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set([
  'length',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'trimStart',
  'trimEnd',
  'includes',
  'indexOf',
  'lastIndexOf',
  'startsWith',
  'endsWith',
  'filter',
  'map',
  'slice',
  'join',
  'toString',
  'split',
  'replace',
  'concat',
  'find',
  'findIndex',
  'some',
  'every',
  'reduce',
  'reverse',
  'sort',
  'flat',
  'flatMap',
  'keys',
  'values',
  'entries',
  'charAt',
  'substring',
  'padStart',
  'padEnd',
  'repeat',
  'toFixed',
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
]);

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    const pos = i;

    // Template string (backtick)
    if (input[i] === '`') {
      i++;
      let str = '';
      while (i < input.length && input[i] !== '`') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // skip closing backtick
      tokens.push({ type: TokenType.TemplateString, value: str, pos });
      continue;
    }

    // String literals
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          const next = input[i + 1];
          if (next === 'n') { str += '\n'; i += 2; }
          else if (next === 't') { str += '\t'; i += 2; }
          else if (next === '\\') { str += '\\'; i += 2; }
          else if (next === quote) { str += quote; i += 2; }
          else { str += next; i += 2; }
        } else {
          str += input[i];
          i++;
        }
      }
      i++; // skip closing quote
      tokens.push({ type: TokenType.String, value: str, pos });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(input[i]) || (input[i] === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push({ type: TokenType.Number, value: parseFloat(num), pos });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(input[i])) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      if (ident === 'true') {
        tokens.push({ type: TokenType.Boolean, value: true, pos });
      } else if (ident === 'false') {
        tokens.push({ type: TokenType.Boolean, value: false, pos });
      } else if (ident === 'null') {
        tokens.push({ type: TokenType.Null, value: null, pos });
      } else if (ident === 'undefined') {
        tokens.push({ type: TokenType.Null, value: undefined, pos });
      } else {
        tokens.push({ type: TokenType.Identifier, value: ident, pos });
      }
      continue;
    }

    // Multi-character operators
    if (input[i] === '=' && input[i + 1] === '=' && input[i + 2] === '=') {
      tokens.push({ type: TokenType.Eq, value: '===', pos });
      i += 3;
      continue;
    }
    if (input[i] === '!' && input[i + 1] === '=' && input[i + 2] === '=') {
      tokens.push({ type: TokenType.NotEq, value: '!==', pos });
      i += 3;
      continue;
    }
    if (input[i] === '=' && input[i + 1] === '=') {
      tokens.push({ type: TokenType.EqLoose, value: '==', pos });
      i += 2;
      continue;
    }
    if (input[i] === '!' && input[i + 1] === '=') {
      tokens.push({ type: TokenType.NotEqLoose, value: '!=', pos });
      i += 2;
      continue;
    }
    if (input[i] === '&' && input[i + 1] === '&') {
      tokens.push({ type: TokenType.And, value: '&&', pos });
      i += 2;
      continue;
    }
    if (input[i] === '|' && input[i + 1] === '|') {
      tokens.push({ type: TokenType.Or, value: '||', pos });
      i += 2;
      continue;
    }
    if (input[i] === '<' && input[i + 1] === '=') {
      tokens.push({ type: TokenType.Lte, value: '<=', pos });
      i += 2;
      continue;
    }
    if (input[i] === '>' && input[i + 1] === '=') {
      tokens.push({ type: TokenType.Gte, value: '>=', pos });
      i += 2;
      continue;
    }
    if (input[i] === '=' && input[i + 1] === '>') {
      tokens.push({ type: TokenType.Arrow, value: '=>', pos });
      i += 2;
      continue;
    }

    // Single-character tokens
    const singleChars: Record<string, TokenType> = {
      '.': TokenType.Dot,
      '[': TokenType.LBracket,
      ']': TokenType.RBracket,
      '(': TokenType.LParen,
      ')': TokenType.RParen,
      ',': TokenType.Comma,
      '+': TokenType.Plus,
      '-': TokenType.Minus,
      '*': TokenType.Star,
      '/': TokenType.Slash,
      '%': TokenType.Percent,
      '!': TokenType.Not,
      '<': TokenType.Lt,
      '>': TokenType.Gt,
      '?': TokenType.Question,
      ':': TokenType.Colon,
    };

    if (input[i] in singleChars) {
      tokens.push({ type: singleChars[input[i]], value: input[i], pos });
      i++;
      continue;
    }

    // Unknown character - skip it
    i++;
  }

  tokens.push({ type: TokenType.EOF, value: null, pos: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent)
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private pos: number;
  private scope: Record<string, any>;

  constructor(tokens: Token[], scope: Record<string, any>) {
    this.tokens = tokens;
    this.pos = 0;
    this.scope = scope;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: null, pos: -1 };
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new Error(`Expected token type ${type}, got ${t.type} at pos ${t.pos}`);
    }
    return this.advance();
  }

  // Entry point
  parse(): any {
    const result = this.parseTernary();
    return result;
  }

  // Ternary: expr ? expr : expr
  private parseTernary(): any {
    const condition = this.parseOr();
    if (this.peek().type === TokenType.Question) {
      this.advance(); // skip ?
      const consequent = this.parseTernary();
      this.expect(TokenType.Colon);
      const alternate = this.parseTernary();
      return condition ? consequent : alternate;
    }
    return condition;
  }

  // Logical OR: expr || expr
  private parseOr(): any {
    let left = this.parseAnd();
    while (this.peek().type === TokenType.Or) {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  // Logical AND: expr && expr
  private parseAnd(): any {
    let left = this.parseEquality();
    while (this.peek().type === TokenType.And) {
      this.advance();
      const right = this.parseEquality();
      left = left && right;
    }
    return left;
  }

  // Equality: expr === expr, expr !== expr, ==, !=
  private parseEquality(): any {
    let left = this.parseComparison();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Eq) {
        this.advance();
        const right = this.parseComparison();
        left = left === right;
      } else if (t.type === TokenType.NotEq) {
        this.advance();
        const right = this.parseComparison();
        left = left !== right;
      } else if (t.type === TokenType.EqLoose) {
        this.advance();
        const right = this.parseComparison();
        // deno-lint-ignore eqeqeq
        left = left == right;
      } else if (t.type === TokenType.NotEqLoose) {
        this.advance();
        const right = this.parseComparison();
        // deno-lint-ignore eqeqeq
        left = left != right;
      } else {
        break;
      }
    }
    return left;
  }

  // Comparison: expr < expr, expr > expr, <=, >=
  private parseComparison(): any {
    let left = this.parseAdditive();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Lt) {
        this.advance();
        const right = this.parseAdditive();
        left = left < right;
      } else if (t.type === TokenType.Gt) {
        this.advance();
        const right = this.parseAdditive();
        left = left > right;
      } else if (t.type === TokenType.Lte) {
        this.advance();
        const right = this.parseAdditive();
        left = left <= right;
      } else if (t.type === TokenType.Gte) {
        this.advance();
        const right = this.parseAdditive();
        left = left >= right;
      } else {
        break;
      }
    }
    return left;
  }

  // Additive: expr + expr, expr - expr
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Plus) {
        this.advance();
        const right = this.parseMultiplicative();
        left = left + right;
      } else if (t.type === TokenType.Minus) {
        this.advance();
        const right = this.parseMultiplicative();
        left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  // Multiplicative: expr * expr, expr / expr, expr % expr
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.Star) {
        this.advance();
        const right = this.parseUnary();
        left = left * right;
      } else if (t.type === TokenType.Slash) {
        this.advance();
        const right = this.parseUnary();
        left = right !== 0 ? left / right : 0;
      } else if (t.type === TokenType.Percent) {
        this.advance();
        const right = this.parseUnary();
        left = right !== 0 ? left % right : 0;
      } else {
        break;
      }
    }
    return left;
  }

  // Unary: !expr, -expr, +expr
  private parseUnary(): any {
    const t = this.peek();
    if (t.type === TokenType.Not) {
      this.advance();
      return !this.parseUnary();
    }
    if (t.type === TokenType.Minus) {
      this.advance();
      return -this.parseUnary();
    }
    if (t.type === TokenType.Plus) {
      this.advance();
      return +this.parseUnary();
    }
    return this.parsePostfix();
  }

  // Postfix: member access (.prop), index access ([expr]), function call (args)
  private parsePostfix(): any {
    let obj = this.parsePrimary();

    while (true) {
      const t = this.peek();

      // Property access: obj.prop
      if (t.type === TokenType.Dot) {
        this.advance();
        const prop = this.expect(TokenType.Identifier).value;

        // Check if it's a method call: obj.method(...)
        if (this.peek().type === TokenType.LParen) {
          this.advance(); // skip (
          const args = this.parseArgList();
          this.expect(TokenType.RParen);
          obj = this.callMethod(obj, prop, args);
        } else {
          // Property access (also handles .length)
          if (prop === 'length' && (typeof obj === 'string' || Array.isArray(obj))) {
            obj = obj.length;
          } else if (obj != null && typeof obj === 'object') {
            obj = obj[prop];
          } else {
            obj = undefined;
          }
        }
        continue;
      }

      // Index access: obj[expr]
      if (t.type === TokenType.LBracket) {
        this.advance();
        const index = this.parseTernary();
        this.expect(TokenType.RBracket);
        if (obj != null) {
          obj = obj[index];
        } else {
          obj = undefined;
        }
        continue;
      }

      // Direct function call (for things already resolved to functions)
      if (t.type === TokenType.LParen && typeof obj === 'function') {
        this.advance();
        const args = this.parseArgList();
        this.expect(TokenType.RParen);
        obj = obj(...args);
        continue;
      }

      break;
    }

    return obj;
  }

  // Parse argument list (comma-separated expressions)
  private parseArgList(): any[] {
    const args: any[] = [];
    if (this.peek().type === TokenType.RParen) {
      return args;
    }
    // Check if the first argument is an arrow function
    args.push(this.parseArgOrArrowFunction());
    while (this.peek().type === TokenType.Comma) {
      this.advance();
      args.push(this.parseArgOrArrowFunction());
    }
    return args;
  }

  // Parse either an arrow function or a normal expression as an argument
  private parseArgOrArrowFunction(): any {
    // Try to detect arrow function patterns:
    // (param) => expr
    // param => expr
    const savedPos = this.pos;

    // Pattern: identifier => expr
    if (this.peek().type === TokenType.Identifier) {
      const paramName = this.peek().value;
      const nextPos = this.pos + 1;
      if (nextPos < this.tokens.length && this.tokens[nextPos].type === TokenType.Arrow) {
        this.advance(); // consume identifier
        this.advance(); // consume =>
        // Capture the body tokens and create a closure
        return this.createArrowFunction([paramName]);
      }
    }

    // Pattern: (params) => expr
    if (this.peek().type === TokenType.LParen) {
      // Look ahead to see if this is an arrow function
      let lookAhead = this.pos + 1;
      const params: string[] = [];
      let isArrow = false;

      while (lookAhead < this.tokens.length) {
        if (this.tokens[lookAhead].type === TokenType.Identifier) {
          params.push(this.tokens[lookAhead].value);
          lookAhead++;
          if (this.tokens[lookAhead]?.type === TokenType.Comma) {
            lookAhead++;
          }
        } else if (this.tokens[lookAhead].type === TokenType.RParen) {
          lookAhead++;
          if (this.tokens[lookAhead]?.type === TokenType.Arrow) {
            isArrow = true;
          }
          break;
        } else {
          break;
        }
      }

      if (isArrow) {
        this.advance(); // skip (
        const paramNames: string[] = [];
        while (this.peek().type === TokenType.Identifier) {
          paramNames.push(this.advance().value);
          if (this.peek().type === TokenType.Comma) this.advance();
        }
        this.expect(TokenType.RParen);
        this.expect(TokenType.Arrow);
        return this.createArrowFunction(paramNames);
      }
    }

    // Reset and parse as normal expression
    this.pos = savedPos;
    return this.parseTernary();
  }

  // Create an arrow function that evaluates its body expression with parameters in scope
  private createArrowFunction(paramNames: string[]): (...args: any[]) => any {
    // We need to capture the remaining tokens for the body expression.
    // The body extends until we hit a comma at the same paren depth or a closing paren.
    const bodyTokens: Token[] = [];
    let depth = 0;

    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t.type === TokenType.LParen || t.type === TokenType.LBracket) {
        depth++;
      } else if (t.type === TokenType.RParen || t.type === TokenType.RBracket) {
        if (depth === 0) break;
        depth--;
      } else if (t.type === TokenType.Comma && depth === 0) {
        break;
      } else if (t.type === TokenType.EOF) {
        break;
      }
      bodyTokens.push(this.advance());
    }

    bodyTokens.push({ type: TokenType.EOF, value: null, pos: -1 });

    const outerScope = this.scope;

    return (...args: any[]): any => {
      const innerScope = { ...outerScope };
      for (let i = 0; i < paramNames.length; i++) {
        innerScope[paramNames[i]] = args[i];
      }
      const parser = new Parser(bodyTokens, innerScope);
      return parser.parse();
    };
  }

  // Primary expressions
  private parsePrimary(): any {
    const t = this.peek();

    // Number
    if (t.type === TokenType.Number) {
      this.advance();
      return t.value;
    }

    // String
    if (t.type === TokenType.String) {
      this.advance();
      return t.value;
    }

    // Template string (simple - no interpolation in this evaluator)
    if (t.type === TokenType.TemplateString) {
      this.advance();
      // Handle template literal interpolation: ${...}
      return this.interpolateTemplate(t.value);
    }

    // Boolean
    if (t.type === TokenType.Boolean) {
      this.advance();
      return t.value;
    }

    // Null
    if (t.type === TokenType.Null) {
      this.advance();
      return t.value;
    }

    // Parenthesized expression
    if (t.type === TokenType.LParen) {
      this.advance();
      const val = this.parseTernary();
      this.expect(TokenType.RParen);
      return val;
    }

    // Array literal: [expr, expr, ...]
    if (t.type === TokenType.LBracket) {
      this.advance();
      const elements: any[] = [];
      if (this.peek().type !== TokenType.RBracket) {
        elements.push(this.parseTernary());
        while (this.peek().type === TokenType.Comma) {
          this.advance();
          if (this.peek().type === TokenType.RBracket) break; // trailing comma
          elements.push(this.parseTernary());
        }
      }
      this.expect(TokenType.RBracket);
      return elements;
    }

    // Identifier - resolve from scope
    if (t.type === TokenType.Identifier) {
      this.advance();
      const name = t.value;

      // Built-in functions
      if (name === 'Math') return Math;
      if (name === 'JSON') return JSON;
      if (name === 'String') return String;
      if (name === 'Number') return Number;
      if (name === 'Boolean') return Boolean;
      if (name === 'Array') return Array;
      if (name === 'Object') return Object;
      if (name === 'parseInt') return parseInt;
      if (name === 'parseFloat') return parseFloat;
      if (name === 'isNaN') return isNaN;
      if (name === 'isFinite') return isFinite;
      if (name === 'Date') return Date;

      // Resolve from scope
      if (name in this.scope) {
        return this.scope[name];
      }

      return undefined;
    }

    // Unary minus for negative numbers is handled in parseUnary
    // If we get here with a minus, skip it
    if (t.type === TokenType.Minus) {
      this.advance();
      return -this.parsePrimary();
    }

    // EOF or unknown - return undefined
    return undefined;
  }

  // Interpolate template strings with ${...} expressions
  private interpolateTemplate(template: string): string {
    let result = '';
    let i = 0;
    while (i < template.length) {
      if (template[i] === '$' && template[i + 1] === '{') {
        // Find matching closing brace
        let depth = 1;
        let j = i + 2;
        while (j < template.length && depth > 0) {
          if (template[j] === '{') depth++;
          else if (template[j] === '}') depth--;
          j++;
        }
        const exprStr = template.substring(i + 2, j - 1);
        const tokens = tokenize(exprStr);
        const parser = new Parser(tokens, this.scope);
        const val = parser.parse();
        result += val != null ? String(val) : '';
        i = j;
      } else {
        result += template[i];
        i++;
      }
    }
    return result;
  }

  // Safe method calls
  private callMethod(obj: any, method: string, args: any[]): any {
    if (obj == null) return undefined;

    if (!SAFE_METHODS.has(method)) {
      throw new Error(`Method '${method}' is not allowed`);
    }

    // String methods
    if (typeof obj === 'string') {
      switch (method) {
        case 'toUpperCase': return obj.toUpperCase();
        case 'toLowerCase': return obj.toLowerCase();
        case 'trim': return obj.trim();
        case 'trimStart': return obj.trimStart();
        case 'trimEnd': return obj.trimEnd();
        case 'includes': return obj.includes(args[0]);
        case 'indexOf': return obj.indexOf(args[0], args[1]);
        case 'lastIndexOf': return obj.lastIndexOf(args[0], args[1]);
        case 'startsWith': return obj.startsWith(args[0]);
        case 'endsWith': return obj.endsWith(args[0]);
        case 'slice': return obj.slice(args[0], args[1]);
        case 'split': return obj.split(args[0], args[1]);
        case 'replace': return obj.replace(args[0], args[1]);
        case 'concat': return obj.concat(...args);
        case 'charAt': return obj.charAt(args[0] ?? 0);
        case 'substring': return obj.substring(args[0], args[1]);
        case 'padStart': return obj.padStart(args[0], args[1]);
        case 'padEnd': return obj.padEnd(args[0], args[1]);
        case 'repeat': return obj.repeat(args[0]);
        case 'toString': return obj.toString();
      }
    }

    // Array methods
    if (Array.isArray(obj)) {
      switch (method) {
        case 'filter': return typeof args[0] === 'function' ? obj.filter(args[0]) : obj;
        case 'map': return typeof args[0] === 'function' ? obj.map(args[0]) : obj;
        case 'find': return typeof args[0] === 'function' ? obj.find(args[0]) : undefined;
        case 'findIndex': return typeof args[0] === 'function' ? obj.findIndex(args[0]) : -1;
        case 'some': return typeof args[0] === 'function' ? obj.some(args[0]) : false;
        case 'every': return typeof args[0] === 'function' ? obj.every(args[0]) : true;
        case 'reduce': return typeof args[0] === 'function' ? obj.reduce(args[0], args[1]) : obj;
        case 'includes': return obj.includes(args[0]);
        case 'indexOf': return obj.indexOf(args[0]);
        case 'lastIndexOf': return obj.lastIndexOf(args[0]);
        case 'slice': return obj.slice(args[0], args[1]);
        case 'join': return obj.join(args[0] ?? ',');
        case 'concat': return obj.concat(...args);
        case 'reverse': return [...obj].reverse();
        case 'sort': return typeof args[0] === 'function' ? [...obj].sort(args[0]) : [...obj].sort();
        case 'flat': return obj.flat(args[0]);
        case 'flatMap': return typeof args[0] === 'function' ? obj.flatMap(args[0]) : obj;
        case 'keys': return Array.from(obj.keys());
        case 'values': return Array.from(obj.values());
        case 'entries': return Array.from(obj.entries());
        case 'push': { const copy = [...obj]; copy.push(...args); return copy; }
        case 'pop': { const copy = [...obj]; copy.pop(); return copy; }
        case 'shift': { const copy = [...obj]; copy.shift(); return copy; }
        case 'unshift': { const copy = [...obj]; copy.unshift(...args); return copy; }
        case 'splice': { const copy = [...obj]; copy.splice(args[0], args[1], ...args.slice(2)); return copy; }
        case 'toString': return obj.toString();
      }
    }

    // Number methods
    if (typeof obj === 'number') {
      switch (method) {
        case 'toFixed': return obj.toFixed(args[0] ?? 0);
        case 'toString': return obj.toString(args[0]);
      }
    }

    // Object methods
    if (typeof obj === 'object' && obj !== null) {
      switch (method) {
        case 'keys': return Object.keys(obj);
        case 'values': return Object.values(obj);
        case 'entries': return Object.entries(obj);
        case 'toString': return JSON.stringify(obj);
        case 'includes': {
          if (Array.isArray(obj)) return obj.includes(args[0]);
          return false;
        }
      }
    }

    // Generic fallback for safe methods
    if (typeof obj[method] === 'function' && SAFE_METHODS.has(method)) {
      return obj[method](...args);
    }

    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate an expression string against a scope object.
 *
 * If the expression starts with "$:", the prefix is stripped and the
 * expression is evaluated. Otherwise, the raw value is returned as a literal.
 *
 * @param expression - The expression string to evaluate
 * @param scope - Variables available to the expression (e.g. { state: {...}, item: {...} })
 * @returns The evaluated result, or null on error
 */
export function evaluateExpression(expression: any, scope: Record<string, any>): any {
  // Non-string values pass through unchanged
  if (typeof expression !== 'string') {
    return expression;
  }

  // If it doesn't start with the expression prefix, return as literal
  if (!expression.startsWith(EXPR_PREFIX)) {
    return expression;
  }

  // Strip the prefix
  const expr = expression.slice(EXPR_PREFIX.length).trim();
  if (!expr) return null;

  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, scope);
    return parser.parse();
  } catch (_err) {
    // Silent fail - return null on error
    return null;
  }
}

/**
 * Resolve all expression values in an object/record.
 * Walks through all values and evaluates any that are expression strings.
 */
export function resolveExpressions(
  obj: Record<string, any>,
  scope: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith(EXPR_PREFIX)) {
      result[key] = evaluateExpression(value, scope);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = resolveExpressions(value, scope);
    } else {
      result[key] = value;
    }
  }
  return result;
}
