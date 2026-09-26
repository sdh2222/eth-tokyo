// Type-safe custom Text types for the watermark theme, by the module augmentation that
// @astryxdesign/core/theme documents on CustomTextTypes. `astryx theme build` 0.6.3 emits
// the CSS for these `type:*` overrides but did not write this augmentation.
export {};

declare module "@astryxdesign/core/theme" {
  interface CustomTextTypes {
    wordmark: true;
    "wordmark-water": true;
  }
}
