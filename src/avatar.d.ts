declare module "virtual:avatar" {
  const avatar: import("astro").ImageMetadata | undefined;
  export default avatar;
}
