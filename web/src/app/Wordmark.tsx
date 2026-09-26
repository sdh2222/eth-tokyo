import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";

// The approved wordmark: "water" in the brand blue and "mark" in ink, in the theme's
// wordmark text type. It fills TopNavHeading's logo slot.
export function Wordmark() {
  return (
    <HStack gap={0} vAlign="center">
      <Text type="wordmark" color="water">
        water
      </Text>
      <Text type="wordmark">mark</Text>
    </HStack>
  );
}
