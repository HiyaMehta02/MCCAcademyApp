import { Image } from 'react-native';

export function IconSymbol({ size, color }) {
    return (
        <Image
            source={{ uri: `` }} // Replace with your icon source
            style={{ width: size, height: size, tintColor: color }} // Apply the color to the icon
        />
    );
}   