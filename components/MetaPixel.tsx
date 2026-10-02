"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, paginaPermitePixel } from "@/lib/metaPixel";

export function MetaPixel() {
  const pathname = usePathname();
  const permitido = paginaPermitePixel(pathname);
  const primeiraVez = useRef(true);

  // PageView nas trocas de página dentro do site (navegação sem recarregar)
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    if (!META_PIXEL_ID || !permitido) return;
    window.fbq?.("track", "PageView");
  }, [pathname, permitido]);

  if (!META_PIXEL_ID || !permitido) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}

export default MetaPixel;
