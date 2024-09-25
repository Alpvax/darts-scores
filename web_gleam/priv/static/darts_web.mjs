// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array, tail) {
    let t = tail || new Empty();
    return array.reduceRight((xs, x) => new NonEmpty(x, xs), t);
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    for (let _ of this) {
      if (desired <= 0)
        return true;
      desired--;
    }
    return desired <= 0;
  }
  // @internal
  hasLength(desired) {
    for (let _ of this) {
      if (desired <= 0)
        return false;
      desired--;
    }
    return desired === 0;
  }
  countLength() {
    let length2 = 0;
    for (let _ of this)
      length2++;
    return length2;
  }
};
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values = [x, y];
  while (values.length) {
    let a = values.pop();
    let b = values.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {
      }
    }
    let [keys, get] = getters(a);
    for (let k of keys(a)) {
      values.push(get(a, k), get(b, k));
    }
  }
  return true;
}
function getters(object) {
  if (object instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list.hasLength(0)) {
      return initial;
    } else {
      let x = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, x);
      loop$fun = fun;
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic.mjs
function from(a) {
  return identity(a);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
function identity(x) {
  return x;
}
function to_string(term) {
  return term.toString();
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function to_string2(x) {
  return to_string(x);
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all) {
    super();
    this.all = all;
  }
};
function none() {
  return new Effect(toList([]));
}

// build/dev/javascript/lustre/lustre/internals/vdom.mjs
var Text = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Element = class extends CustomType {
  constructor(namespace, tag, attrs, children, self_closing, void$) {
    super();
    this.namespace = namespace;
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Attribute = class extends CustomType {
  constructor(x0, x1, as_property) {
    super();
    this[0] = x0;
    this[1] = x1;
    this.as_property = as_property;
  }
};
var Event = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute(name, value) {
  return new Attribute(name, from(value), false);
}
function on(name, handler) {
  return new Event("on" + name, handler);
}
function style(properties) {
  return attribute(
    "style",
    fold(
      properties,
      "",
      (styles, _use1) => {
        let name$1 = _use1[0];
        let value$1 = _use1[1];
        return styles + name$1 + ":" + value$1 + ";";
      }
    )
  );
}
function class$(name) {
  return attribute("class", name);
}
function type_(name) {
  return attribute("type", name);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element(tag, attrs, children) {
  if (tag === "area") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "base") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "br") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "col") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "embed") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "hr") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "img") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "input") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "link") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "meta") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "param") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "source") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "track") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else if (tag === "wbr") {
    return new Element("", tag, attrs, toList([]), false, true);
  } else {
    return new Element("", tag, attrs, children, false, false);
  }
}
function text(content) {
  return new Text(content);
}

// build/dev/javascript/lustre/lustre/internals/runtime.mjs
var Dispatch = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Shutdown = class extends CustomType {
};

// build/dev/javascript/lustre/vdom.ffi.mjs
function morph(prev, curr, dispatch, parent) {
  if (curr?.subtree) {
    return morph(prev, curr.subtree(), dispatch, parent);
  }
  if (curr?.tag && prev?.nodeType === 1) {
    const nodeName = curr.tag.toUpperCase();
    const ns = curr.namespace || "http://www.w3.org/1999/xhtml";
    if (prev.nodeName === nodeName && prev.namespaceURI == ns) {
      return morphElement(prev, curr, dispatch, parent);
    } else {
      return createElement(prev, curr, dispatch, parent);
    }
  }
  if (curr?.tag) {
    return createElement(prev, curr, dispatch, parent);
  }
  if (typeof curr?.content === "string") {
    return prev?.nodeType === 3 ? morphText(prev, curr) : createText(prev, curr);
  }
  return document.createComment(
    [
      "[internal lustre error] I couldn't work out how to render this element. This",
      "function should only be called internally by lustre's runtime: if you think",
      "this is an error, please open an issue at",
      "https://github.com/hayleigh-dot-dev/gleam-lustre/issues/new"
    ].join(" ")
  );
}
function createElement(prev, curr, dispatch, parent = null) {
  const el = curr.namespace ? document.createElementNS(curr.namespace, curr.tag) : document.createElement(curr.tag);
  el.$lustre = {
    __registered_events: /* @__PURE__ */ new Set()
  };
  let dangerousUnescapedHtml = "";
  for (const attr of curr.attrs) {
    if (attr[0] === "class") {
      morphAttr(el, attr[0], `${el.className} ${attr[1]}`);
    } else if (attr[0] === "style") {
      morphAttr(el, attr[0], `${el.style.cssText} ${attr[1]}`);
    } else if (attr[0] === "dangerous-unescaped-html") {
      dangerousUnescapedHtml += attr[1];
    } else if (attr[0] !== "") {
      morphAttr(el, attr[0], attr[1], dispatch);
    }
  }
  if (customElements.get(curr.tag)) {
    el._slot = curr.children;
  } else if (curr.tag === "slot") {
    let children = new Empty();
    let parentWithSlot = parent;
    while (parentWithSlot) {
      if (parentWithSlot._slot) {
        children = parentWithSlot._slot;
        break;
      } else {
        parentWithSlot = parentWithSlot.parentNode;
      }
    }
    for (const child of children) {
      el.appendChild(morph(null, child, dispatch, el));
    }
  } else if (dangerousUnescapedHtml) {
    el.innerHTML = dangerousUnescapedHtml;
  } else {
    for (const child of curr.children) {
      el.appendChild(morph(null, child, dispatch, el));
    }
  }
  if (prev)
    prev.replaceWith(el);
  return el;
}
function morphElement(prev, curr, dispatch, parent) {
  const prevAttrs = prev.attributes;
  const currAttrs = /* @__PURE__ */ new Map();
  prev.$lustre ??= { __registered_events: /* @__PURE__ */ new Set() };
  for (const currAttr of curr.attrs) {
    if (currAttr[0] === "class" && currAttrs.has("class")) {
      currAttrs.set(currAttr[0], `${currAttrs.get("class")} ${currAttr[1]}`);
    } else if (currAttr[0] === "style" && currAttrs.has("style")) {
      currAttrs.set(currAttr[0], `${currAttrs.get("style")} ${currAttr[1]}`);
    } else if (currAttr[0] === "dangerous-unescaped-html" && currAttrs.has("dangerous-unescaped-html")) {
      currAttrs.set(
        currAttr[0],
        `${currAttrs.get("dangerous-unescaped-html")} ${currAttr[1]}`
      );
    } else if (currAttr[0] !== "") {
      currAttrs.set(currAttr[0], currAttr[1]);
    }
  }
  for (const { name } of prevAttrs) {
    if (!currAttrs.has(name)) {
      prev.removeAttribute(name);
    } else {
      const value = currAttrs.get(name);
      morphAttr(prev, name, value, dispatch);
      currAttrs.delete(name);
    }
  }
  for (const name of prev.$lustre.__registered_events) {
    if (!currAttrs.has(name)) {
      const event = name.slice(2).toLowerCase();
      prev.removeEventListener(event, prev.$lustre[`${name}Handler`]);
      prev.$lustre.__registered_events.delete(name);
      delete prev.$lustre[name];
      delete prev.$lustre[`${name}Handler`];
    }
  }
  for (const [name, value] of currAttrs) {
    morphAttr(prev, name, value, dispatch);
  }
  if (customElements.get(curr.tag)) {
    prev._slot = curr.children;
  } else if (curr.tag === "slot") {
    let prevChild = prev.firstChild;
    let currChild = new Empty();
    let parentWithSlot = parent;
    while (parentWithSlot) {
      if (parentWithSlot._slot) {
        currChild = parentWithSlot._slot;
        break;
      } else {
        parentWithSlot = parentWithSlot.parentNode;
      }
    }
    while (prevChild) {
      if (Array.isArray(currChild) && currChild.length) {
        morph(prevChild, currChild.shift(), dispatch, prev);
      } else if (currChild.head) {
        morph(prevChild, currChild.head, dispatch, prev);
        currChild = currChild.tail;
      }
      prevChild = prevChild.nextSibling;
    }
    for (const child of currChild) {
      prev.appendChild(morph(null, child, dispatch, prev));
    }
  } else if (currAttrs.has("dangerous-unescaped-html")) {
    prev.innerHTML = currAttrs.get("dangerous-unescaped-html");
  } else {
    let prevChild = prev.firstChild;
    let currChild = curr.children;
    while (prevChild) {
      if (Array.isArray(currChild) && currChild.length) {
        const next = prevChild.nextSibling;
        morph(prevChild, currChild.shift(), dispatch, prev);
        prevChild = next;
      } else if (currChild.head) {
        const next = prevChild.nextSibling;
        morph(prevChild, currChild.head, dispatch, prev);
        currChild = currChild.tail;
        prevChild = next;
      } else {
        const next = prevChild.nextSibling;
        prevChild.remove();
        prevChild = next;
      }
    }
    for (const child of currChild) {
      prev.appendChild(morph(null, child, dispatch, prev));
    }
  }
  return prev;
}
function morphAttr(el, name, value, dispatch) {
  switch (typeof value) {
    case (name.startsWith("data-lustre-on-") && "string"): {
      if (!value) {
        el.removeAttribute(name);
        el.removeEventListener(event, el.$lustre[`${name}Handler`]);
        break;
      }
      if (el.hasAttribute(name))
        break;
      const event = name.slice(15).toLowerCase();
      const handler = dispatch(serverEventHandler);
      if (el.$lustre[`${name}Handler`]) {
        el.removeEventListener(event, el.$lustre[`${name}Handler`]);
      }
      el.addEventListener(event, handler);
      el.$lustre[name] = value;
      el.$lustre[`${name}Handler`] = handler;
      el.$lustre.__registered_events.add(name);
      el.setAttribute(name, value);
      break;
    }
    case "string":
      if (name === "value")
        el.value = value;
      el.setAttribute(name, value);
      break;
    case (name.startsWith("on") && "function"): {
      if (el.$lustre[name] === value)
        break;
      const event = name.slice(2).toLowerCase();
      const handler = dispatch(value);
      if (el.$lustre[`${name}Handler`]) {
        el.removeEventListener(event, el.$lustre[`${name}Handler`]);
      }
      el.addEventListener(event, handler);
      el.$lustre[name] = value;
      el.$lustre[`${name}Handler`] = handler;
      el.$lustre.__registered_events.add(name);
      break;
    }
    default:
      el[name] = value;
  }
}
function createText(prev, curr) {
  const el = document.createTextNode(curr.content);
  if (prev)
    prev.replaceWith(el);
  return el;
}
function morphText(prev, curr) {
  const prevValue = prev.nodeValue;
  const currValue = curr.content;
  if (!currValue) {
    prev?.remove();
    return null;
  }
  if (prevValue !== currValue)
    prev.nodeValue = currValue;
  return prev;
}
function serverEventHandler(event) {
  const el = event.target;
  const tag = el.getAttribute(`data-lustre-on-${event.type}`);
  const data = JSON.parse(el.getAttribute("data-lustre-data") || "{}");
  const include = JSON.parse(el.getAttribute("data-lustre-include") || "[]");
  switch (event.type) {
    case "input":
    case "change":
      include.push("target.value");
      break;
  }
  return {
    tag,
    data: include.reduce((data2, property) => {
      const path = property.split(".");
      for (let i = 0, o = data2, e = event; i < path.length; i++) {
        if (i === path.length - 1) {
          o[path[i]] = e[path[i]];
        } else {
          o[path[i]] ??= {};
          e = e[path[i]];
          o = o[path[i]];
        }
      }
      return data2;
    }, data)
  };
}

// build/dev/javascript/lustre/client-runtime.ffi.mjs
var LustreClientApplication = class _LustreClientApplication {
  #root = null;
  #queue = [];
  #effects = [];
  #didUpdate = false;
  #model = null;
  #update = null;
  #view = null;
  static start(flags, selector, init2, update2, view2) {
    if (!is_browser())
      return new Error(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root)
      return new Error(new ElementNotFound(selector));
    const app = new _LustreClientApplication(init2(flags), update2, view2, root);
    return new Ok((msg) => app.send(msg));
  }
  constructor([model, effects], update2, view2, root = document.body) {
    this.#model = model;
    this.#update = update2;
    this.#view = view2;
    this.#root = root;
    this.#effects = effects.all.toArray();
    this.#didUpdate = true;
    window.requestAnimationFrame(() => this.#tick());
  }
  send(action) {
    switch (true) {
      case action instanceof Dispatch: {
        this.#queue.push(action[0]);
        this.#tick();
        return;
      }
      case action instanceof Shutdown: {
        this.#shutdown();
        return;
      }
      default:
        return;
    }
  }
  emit(event, data) {
    this.#root.dispatchEvent(
      new CustomEvent(event, {
        bubbles: true,
        detail: data,
        composed: true
      })
    );
  }
  #tick() {
    this.#flush_queue();
    const vdom = this.#view(this.#model);
    this.#didUpdate = false;
    this.#root = morph(this.#root, vdom, (handler) => (e) => {
      const result = handler(e);
      if (result.isOk()) {
        this.send(new Dispatch(result[0]));
      }
    });
  }
  #flush_queue(iterations = 0) {
    while (this.#queue.length) {
      const [next, effects] = this.#update(this.#model, this.#queue.shift());
      this.#didUpdate ||= !isEqual(this.#model, next);
      this.#model = next;
      this.#effects = this.#effects.concat(effects.all.toArray());
    }
    while (this.#effects.length) {
      this.#effects.shift()(
        (msg) => this.send(new Dispatch(msg)),
        (event, data) => this.emit(event, data)
      );
    }
    if (this.#queue.length) {
      if (iterations < 5) {
        this.#flush_queue(++iterations);
      } else {
        window.requestAnimationFrame(() => this.#tick());
      }
    }
  }
  #shutdown() {
    this.#root.remove();
    this.#root = null;
    this.#model = null;
    this.#queue = [];
    this.#effects = [];
    this.#didUpdate = false;
    this.#update = () => {
    };
    this.#view = () => {
    };
  }
};
var start = (app, selector, flags) => LustreClientApplication.start(
  flags,
  selector,
  app.init,
  app.update,
  app.view
);
var is_browser = () => window && window.document;

// build/dev/javascript/lustre/lustre/element/html.mjs
function div(attrs, children) {
  return element("div", attrs, children);
}
function p(attrs, children) {
  return element("p", attrs, children);
}
function button(attrs, children) {
  return element("button", attrs, children);
}

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init2, update2, view2, on_attribute_change) {
    super();
    this.init = init2;
    this.update = update2;
    this.view = view2;
    this.on_attribute_change = on_attribute_change;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init2, update2, view2) {
  return new App(init2, update2, view2, new None());
}
function simple(init2, update2, view2) {
  let init$1 = (flags) => {
    return [init2(flags), none()];
  };
  let update$1 = (model, msg) => {
    return [update2(model, msg), none()];
  };
  return application(init$1, update$1, view2);
}
function start2(app, selector, flags) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, flags);
    }
  );
}

// build/dev/javascript/lustre/lustre/event.mjs
function on2(name, handler) {
  return on(name, handler);
}
function on_click(msg) {
  return on2("click", (_) => {
    return new Ok(msg);
  });
}

// build/dev/javascript/lustre_ui/lustre/ui/button.mjs
function button2(attributes, children) {
  return button(
    toList(
      [class$("lustre-ui-button"), type_("button")],
      attributes
    ),
    children
  );
}

// build/dev/javascript/lustre_ui/lustre/ui/centre.mjs
function of(element2, attributes, children) {
  return element2(
    toList([class$("lustre-ui-centre")], attributes),
    toList([children])
  );
}
function centre(attributes, children) {
  return of(div, attributes, children);
}

// build/dev/javascript/lustre_ui/lustre/ui/stack.mjs
function of2(element2, attributes, children) {
  return element2(
    toList([class$("lustre-ui-stack")], attributes),
    children
  );
}
function stack(attributes, children) {
  return of2(div, attributes, children);
}

// build/dev/javascript/lustre_ui/lustre/ui.mjs
var button3 = button2;
var centre2 = centre;
var stack2 = stack;

// build/dev/javascript/darts_web/darts_web.mjs
var Incr = class extends CustomType {
};
var Decr = class extends CustomType {
};
function init(initial_count) {
  if (initial_count instanceof Some && initial_count[0] >= 0) {
    let i = initial_count[0];
    return i;
  } else {
    return 0;
  }
}
function update(model, msg) {
  if (msg instanceof Incr) {
    return model + 1;
  } else {
    return model - 1;
  }
}
function view(model) {
  let styles = toList([
    ["width", "100vw"],
    ["height", "100vh"],
    ["padding", "1rem"]
  ]);
  let count = to_string2(model);
  return centre2(
    toList([style(styles)]),
    stack2(
      toList([]),
      toList([
        button3(
          toList([on_click(new Incr())]),
          toList([text("+")])
        ),
        p(
          toList([style(toList([["text-align", "center"]]))]),
          toList([text(count)])
        ),
        button3(
          toList([on_click(new Decr())]),
          toList([text("-")])
        )
      ])
    )
  );
}
function main() {
  let app = simple(init, update, view);
  let $ = start2(app, "#app", new None());
  if (!$.isOk()) {
    throw makeError(
      "assignment_no_match",
      "darts_web",
      22,
      "main",
      "Assignment pattern did not match",
      { value: $ }
    );
  }
  return $;
}

// build/.lustre/entry.mjs
main();
