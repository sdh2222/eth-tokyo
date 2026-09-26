import type { AnchorHTMLAttributes, Ref } from "react";
import { Link } from "react-router-dom";

// The LinkProvider adapter, shaped like the LinkProviderCustomLink template: Astryx
// hands every link an `href`, and React Router takes `to`. External and hash links
// stay plain anchors.
export function RouterLink({
  href = "",
  ref,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { ref?: Ref<HTMLAnchorElement> }) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) {
    return <a ref={ref} href={href} {...props} />;
  }
  return <Link ref={ref} to={href} {...props} />;
}
