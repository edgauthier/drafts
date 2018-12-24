// drafts

// General-purpose functional library. 
// More info at https://ramdajs.com/
require('ramda.js');

/*

Functions for use specifically with the Drafts app. 

Many of these enable working with Drafts scripting in a more functional manner. 

*/

// #region Prompt

// Title, Message -> Prompt
const newPrompt = (t = "", m = "") => 
  Object.assign(Prompt.create(), {title: t, message: m});

// Prompt, Button -> Prompt
const addButton = (p, b) => {p.addButton(b);return p;};

// Title, Buttons -> Prompt
const buttonPrompt = (t, bs) => bs.reduce(addButton, newPrompt(t));

// p = Prompt
// c = ["funcName", [arguments]]
const addControl = (p, c) => {
  const func = c[0], args = c[1];
  p[func](...args);
  return p;
};

// Define a prompt in a object
// {
//   title: "",
//   message: "",
//   controls: [
//     ["funcName", [arguments]],
//     ["funcName", [arguments]]
//   ]
// }
const customPrompt = p => 
  p.controls.reduce(addControl, newPrompt(p.title, p.message));
  
const inputString = (t, m) => {
  const pObj = {
    title: t,
    message: m,
    controls: [
      ['addTextField', ['i', 'Input', '', {wantsFocus: true}]],
      ['addButton', ['OK']]
    ]
  };
  const p = customPrompt(pObj);
  p.isCancellable = false;
  return p.show() 
    ? p.fieldValues['i']
    : '';
};

// #region CallbackURL

// URL -> CallbackURL
const callbackObj = url =>
  Object.assign(CallbackURL.create(), {baseURL: url});

// CallbackURL, paramater array -> CallbackURL
const addParam = (cb, v) => {
  cb.addParameter(...v);
  return cb;
};

// URL, Paramaters -> CallbackURL
const callback = (url, params) => 
  params.reduce(addParam, callbackObj(url));

// #region Draft

const addTag = (d, t) => {d.addTag(t);d.update();return d};

// Content, Grammar -> new draft
const newDraft = (c, g = null, tags = []) => {
  let d = tags.reduce(addTag, Draft.create());
  d.content = c;
  d.languageGrammar = g;
  d.update();
  return d;
};

// Content, Grammar, Tags -> new draft
const loadNewDraft = (c, g, t) => loadDraft(newDraft(c, g, t));

// Load an existing draft into the editor
// and update the draft variable
const loadDraft = d => {
  if (d) editor.load((draft = d));
  return d;
};

// #region Selected Text

// Return the selected text if any
// Otherwise, select and return entire draft contents
const getSelectedOrAllText = () => {
  const
    r = editor.getSelectedRange(),
    s = r[1] > 0 
      ? editor.getSelectedText()
      : draft.content,
    p = r[1] === 0 ? 0 : r[0];
  // update select range
  editor.setSelectedRange(p, s.length); 
  return s;
};

// Wraps a selection with the start and end strings
// If no selection, insert start/end and put cursor
// in between.
const wrapSelection = (start, end) => {
  const 
    text = editor.getSelectedText(),
    pos = editor.getSelectedRange()[0],
    newText = text.length 
      ? start + text + end
      : start + end,
    newPos = text.length 
      ? pos + newText.length
      : pos + start.length;
  
  editor.setSelectedText(newText);
  editor.setSelectedRange(newPos, 0);
}