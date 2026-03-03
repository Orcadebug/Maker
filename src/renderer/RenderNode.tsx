// Recursive renderer: takes a RenderedNode (server JSON) and maps it to native components.
// No logic, no expression evaluation -- just component mapping and event forwarding.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
  type ListRenderItemInfo,
} from 'react-native';
import type { RenderedNode } from '../types';
import { getComponent } from './ComponentRegistry';
import { eventSender } from './EventSender';

interface RenderNodeProps {
  node: RenderedNode;
}

const RenderNodeComponent: React.FC<RenderNodeProps> = ({ node }) => {
  // If server says not visible, render nothing
  if (!node.visible) return null;

  const entry = getComponent(node.type);

  // Unknown component type: render as View with dev warning
  if (!entry) {
    if (__DEV__) {
      console.warn(`[RenderNode] Unknown component type: "${node.type}"`);
    }
    return (
      <View style={node.style}>
        {node.children?.map((child) => (
          <RenderNode key={child.id} node={child} />
        ))}
      </View>
    );
  }

  const hasEvent = (eventType: string) => node.events?.includes(eventType) ?? false;

  // Delegate to specialized renderers per type
  switch (node.type) {
    case 'text':
      return <TextNode node={node} />;
    case 'textInput':
      return <TextInputNode node={node} />;
    case 'button':
      return <ButtonNode node={node} />;
    case 'image':
      return <ImageNode node={node} />;
    case 'switch':
      return <SwitchNode node={node} />;
    case 'flatList':
      return <FlatListNode node={node} />;
    default:
      // Generic container: view, scrollView, safeArea, activityIndicator, etc.
      return <GenericNode node={node} hasEvent={hasEvent} />;
  }
};

// --- Text ---
const TextNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const hasPress = node.events?.includes('press') ?? false;

  const handlePress = useCallback(() => {
    eventSender.sendEvent('press', node.id);
  }, [node.id]);

  return (
    <Text style={node.style} onPress={hasPress ? handlePress : undefined} {...node.props}>
      {node.props.text ?? null}
      {node.children?.map((child) => (
        <RenderNode key={child.id} node={child} />
      ))}
    </Text>
  );
});
TextNode.displayName = 'TextNode';

// --- TextInput ---
const TextInputNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const entry = getComponent('textInput')!;
  const Component = entry.component;

  const [localValue, setLocalValue] = useState<string>(node.props.value ?? '');

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      eventSender.setInputValue(node.id, text);
      if (node.events?.includes('change')) {
        eventSender.sendEvent('change', node.id, text);
      }
    },
    [node.id, node.events],
  );

  const handleSubmit = useCallback(() => {
    if (node.events?.includes('submit')) {
      eventSender.sendEvent('submit', node.id, localValue);
    }
  }, [node.id, node.events, localValue]);

  const { value: _value, text: _text, ...restProps } = node.props;

  return (
    <Component
      style={node.style}
      value={localValue}
      onChangeText={handleChangeText}
      onSubmitEditing={handleSubmit}
      {...restProps}
    />
  );
});
TextInputNode.displayName = 'TextInputNode';

// --- Button (Pressable) ---
const ButtonNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const handlePress = useCallback(() => {
    if (node.events?.includes('press')) {
      eventSender.sendEvent('press', node.id);
    }
  }, [node.id, node.events]);

  const handleLongPress = useCallback(() => {
    if (node.events?.includes('longPress')) {
      eventSender.sendEvent('longPress', node.id);
    }
  }, [node.id, node.events]);

  const hasPress = node.events?.includes('press') ?? false;
  const hasLongPress = node.events?.includes('longPress') ?? false;

  return (
    <Pressable
      style={({ pressed }) => [node.style, pressed && styles.pressedOpacity]}
      onPress={hasPress ? handlePress : undefined}
      onLongPress={hasLongPress ? handleLongPress : undefined}
      disabled={node.props.disabled}
      {...node.props}
    >
      {node.children?.map((child) => (
        <RenderNode key={child.id} node={child} />
      ))}
    </Pressable>
  );
});
ButtonNode.displayName = 'ButtonNode';

// --- Image ---
const ImageNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const entry = getComponent('image')!;
  const Component = entry.component;

  const { uri, ...restProps } = node.props;
  const source: ImageSourcePropType = uri ? { uri } : {};

  return <Component style={node.style} source={source} {...restProps} />;
});
ImageNode.displayName = 'ImageNode';

// --- Switch ---
const SwitchNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const entry = getComponent('switch')!;
  const Component = entry.component;

  const [localValue, setLocalValue] = useState<boolean>(node.props.value ?? false);

  const handleValueChange = useCallback(
    (newValue: boolean) => {
      setLocalValue(newValue);
      eventSender.setInputValue(node.id, newValue);
      if (node.events?.includes('change')) {
        eventSender.sendEvent('change', node.id, newValue);
      }
    },
    [node.id, node.events],
  );

  const { value: _value, ...restProps } = node.props;

  return (
    <Component
      style={node.style}
      value={localValue}
      onValueChange={handleValueChange}
      {...restProps}
    />
  );
});
SwitchNode.displayName = 'SwitchNode';

// --- FlatList ---
const FlatListNode: React.FC<RenderNodeProps> = React.memo(({ node }) => {
  const entry = getComponent('flatList')!;
  const Component = entry.component;

  const data: RenderedNode[] = node.props.data ?? [];

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RenderedNode>) => <RenderNode node={item} />,
    [],
  );

  const keyExtractor = useCallback((item: RenderedNode) => item.id, []);

  const { data: _data, ...restProps } = node.props;

  return (
    <Component
      style={node.style}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      {...restProps}
    />
  );
});
FlatListNode.displayName = 'FlatListNode';

// --- Generic container (view, scrollView, safeArea, activityIndicator) ---
interface GenericNodeProps {
  node: RenderedNode;
  hasEvent: (eventType: string) => boolean;
}

const GenericNode: React.FC<GenericNodeProps> = React.memo(({ node, hasEvent }) => {
  const entry = getComponent(node.type)!;
  const Component = entry.component;

  const handlePress = useCallback(() => {
    eventSender.sendEvent('press', node.id);
  }, [node.id]);

  const rendered = (
    <Component style={node.style} {...node.props}>
      {node.children?.map((child) => (
        <RenderNode key={child.id} node={child} />
      ))}
    </Component>
  );

  // If this generic node has a press event, wrap it in a Pressable
  if (hasEvent('press')) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && styles.pressedOpacity]}
      >
        {rendered}
      </Pressable>
    );
  }

  return rendered;
});
GenericNode.displayName = 'GenericNode';

// --- Styles ---
const styles = StyleSheet.create({
  pressedOpacity: {
    opacity: 0.7,
  },
});

// Memoized export
const RenderNode = React.memo(RenderNodeComponent);
RenderNode.displayName = 'RenderNode';
export default RenderNode;
