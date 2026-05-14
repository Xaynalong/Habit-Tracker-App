import { TextInput, TextInputProps } from 'react-native';

import { useThemeColor } from '@/components/Themed';

export default function ThemedInput(props: TextInputProps) {
  const color = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor(
    { light: '#999', dark: '#888' },
    'text'
  );
  return (
    <TextInput
      placeholderTextColor={placeholderColor}
      {...props}
      style={[{ color }, props.style]}
    />
  );
}
