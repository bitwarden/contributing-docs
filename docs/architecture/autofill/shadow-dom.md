# Shadow DOM

## Introduction

The Shadow DOM API allows a separate, encapsulated DOM tree to be embedded in a page.
[From MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM):

> An important aspect of web components is encapsulation — being able to keep the markup structure,
> style, and behavior hidden and separate from other code on the page so that different parts do not
> clash, and the code can be kept nice and clean. The Shadow DOM API is a key part of this,
> providing a way to attach a hidden separated DOM to an element.
>
> [...]
>
> Shadow DOM allows hidden DOM trees to be attached to elements in the regular DOM tree — this
> shadow DOM tree starts with a shadow root, underneath which you can attach any element, in the
> same way as the normal DOM.

The Shadow DOM API is relevant to our autofill logic, because common DOM query methods such as
`document.querySelector` and `document.querySelectorAll` do not return results that are located in a
Shadow DOM.

The shadow root node has a `mode` property, which can be set to `"open"` or `"closed"`. The `mode`
is intended to (dis)allow access to the Shadow DOM tree by the main DOM, although some browsers
provide specific APIs which can ignore this property.

## How we handle Shadow DOMs

Instead of using `querySelector` methods, we implement similar logic using the
[TreeWalker](https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker) API. The TreeWalker API
provides an interface to traverse nodes individually, which means we can run arbitrary logic against
each node. In practice, we check each visited node for two criteria:

1. Whether the node satisfies the filter callback provided - this allows us to filter for specific
   node(s), as with `querySelector`, but using a callback with full access to the `Element` object
   instead of a selector string
2. Whether the node is a shadow root

If the node is a shadow root, we try to recursively descend into it using the browser API available:

- **Chrome:**
  [chrome.dom.openOrClosedShadowRoot](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot) -
  ignores the `mode` property and works for open and closed shadow roots
- **Firefox:**
  [Element.openOrClosedShadowRoot](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot) -
  ignores the `mode` property and works for open and closed shadow roots. Note that this method
  appears to have been moved to the `browser.dom` namespace but it is unclear from what Firefox
  version that change will take effect. Our current usage is based on superseded documentation which
  can be viewed
  [here](https://github.com/mdn/content/pull/23989/files#diff-7f37c425019133d3fb533ca931fd4bfeeadd74e8e81418da513b5a1ba8f49ccc)
  and appears to still be correct as at Firefox 110.0.
- **Safari and others:**
  [Element.shadowRoot](https://developer.mozilla.org/en-US/docs/Web/API/Element/shadowRoot) -
  respects the `mode` property and will only work for `"open"` shadow roots. We fall back to this
  method if the other APIs are not available.
