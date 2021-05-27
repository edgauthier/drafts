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

// (Title, Message) -> String
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

// Takes in a custom prompt definition, prompts for input, and creates new template tags (prefixed with 'prompt_') for each field in the prompt. 
// Returns false if the prompt is canceled, true otherwise. 
const promptForTags = promptDef => {
  const p = customPrompt(promptDef);
  if (!p.show()) return false;
  const setTag = (value, key) => draft.setTemplateTag(`prompt_${key}`, value);
  R.forEachObjIndexed(setTag, p.fieldValues);
  return true;
};

// prompts for an input and 
const inputTag = (title, tag, type = 'text') => {
  let controls = [];
  switch (type){
    case 'date':
      controls.push(['addDatePicker', [tag, '', new Date(), {'mode': 'date'}]]);
      break;
    case 'text': 
    default: 
      controls.push(['addTextField', [tag, '', '', {'wantsFocus': true}]]);
  }
  controls.push(['addButton', ['OK']]);
  
  if (promptForTags({title, controls})){
    if (type == 'date'){
      const tagName = `prompt_${tag}`;
      const d = new Date(draft.getTemplateTag(tagName));
      draft.setTemplateTag(tagName, shortDate(d));
    }
    editor.activate();
  }
  else {
    context.cancel();
    editor.activate();
  }
}

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

const setTemplateTags = (d, tags) => {
  const setTag = (v,t) => d.setTemplateTag(t,v);
  R.forEachObjIndexed(setTag, tags);
};

const templateDraft = (tpl, props) => {
  let d = Draft.create();
  setTemplateTags(d, props);
  d.content = d.processTemplate(tpl);
  return d;
};

const cleanSlate = () => {
  app.hideDraftList();
  editor.new();
  editor.deactivate();
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

const getSelectedLines = () => {
  const
    // grab selection ranges and text
    selRange = editor.getSelectedRange(),
    lnRange = editor.getSelectedLineRange(),
    lnText = editor.getTextInRange(...lnRange),
    trailingNewline = lnText.endsWith("\n"),
    // ignore trailing newline from getSelectedLineRange if present
    lines = splitLines(trailingNewline ? lnText.slice(0, -1) : lnText);
  return lines;
}

const setSelectedLines = lines => {
  const 
    lnRange = editor.getSelectedLineRange(),
    lnText = editor.getTextInRange(...lnRange),
    trailingNewline = lnText.endsWith("\n"),
    newText = joinLines(lines) + (trailingNewline ? '\n' : ''),
    newStart = lnRange[0],
    newLen = newText.length;

  editor.setTextInRange(...lnRange, newText);
  editor.setSelectedRange(newStart, newLen);
}

//#region Miscellaneous

const csvToObj = (csv, sep = ',') => {
  const
    unquote = s => s.replace(/^"?(.*?)"?$/, '$1'),
    csvSplit = s => s.split(sep).map(unquote),
    lines = csv.split('\n'),
    headers = csvSplit(lines[0]),
    csvZip = R.zipObj(headers),
    result = lines.slice(1).reduce(
      (ls,l) => {
        ls.push(csvZip(csvSplit(l)));
        return ls;
      },[]);
  
  return result;
}

const parseJsonDraft = R.pipe(
  R.prop('content'),
  R.split('\n'),
  R.drop(1), // comment title
  R.join('\n'),
  JSON.parse
);

const jsonDraftToObjWithId = d => {
  let obj = parseJsonDraft(d);
  obj['id'] = d.uuid;
  return obj;
};

const jsonDraftIdToObj = id => {
  let d = Draft.find(id);
  return parseJsonDraft(d);
};

const readLib = path => {
  const
    fm = FileManager.createCloud(),
    fullPath = `Library/Scripts/${path}`,
    output = fm.readString(fullPath);
  return R.defaultTo('', output);
};

const dataToJS = R.pipe(
  R.toPairs,
  R.map(p => `const ${p[0]} = ${JSON.stringify(p[1])};`),
  R.join('\n')
);

const isEmptyOrNil = R.anyPass([R.isEmpty, R.isNil]);

const saveConfig = (name, config) => {
  const fm = FileManager.createLocal();
  fm.writeString(`/${name}.json`, JSON.stringify(config));
}

const loadConfig = name => {
  const 
    parseConfig = R.pipe(
      R.when(isEmptyOrNil, R.always('{}')),
      JSON.parse
    ),
    fm = FileManager.createLocal(),
    config = fm.readString(`/${name}.json`);
  return parseConfig(config);
}

const previewHtml = html => {
  const p = HTMLPreview.create();
  return p.show(html);
}

const previewHtmlDraft = d => previewHtml(d.content);

const dropFirstLine = R.pipe(
  R.split('\n'),
  R.drop(1),
  R.join('\n')
);

// lines :: String -> [String]
const splitLines = s => s.split(/[\r\n]/);

// unlines :: [String] -> String
const joinLines = xs => xs.join('\n');

//#region Date functions

const shortDate = d => strftime(d, '%Y-%m-%d');

const todayShort = () => shortDate(Date.today());

const addMonths = (date, months) => {
  let future = new Date(date);
  future.setMonth(date.getMonth() + +months);
  if (future.getDate() != date.getDate()) {
    future.setDate(0);
  }
  return future;
};

// accepts a date and an offset (ex: +3w, -2d, +1m)
// returns a new date adjusted by the offset
const offsetDate = (date, offset) => {
  let d = new Date(date);
  let offsetRegex = /(\+|-)(\d+)(d|w|m)/;
  let match = offset.match(offsetRegex);
  let multiplier = (match[1] == "+" ? 1 : -1);
  
  if (match[3] == "d") {
    d.setDate(d.getDate() + multiplier * parseInt(match[2]));
  } 
  else if (match[3] == "w") {
    d.setDate(d.getDate() + multiplier * 7 * parseInt(match[2]));
  } 
  else if (match[3] == "m") {
    d = addMonths(d, multiplier * parseInt(match[2]));
  }
  
  return d;
};

//#region Mustache functions

// Mustache functions below based on work by Peter Davison-Reiber
// https://polymaths.blog/2020/12/mustache-prompt-for-drafts

// Prompt for input to replace mustache-based variables in 
// the supplied text and return the updated text
const mustachePrompt = text => {
  const vars = mustacheVars(text);
  let output = null;
  
  if (Object.keys(vars).length == 0) {
    // Nothing to process
    output = text;
  }
  else {
    const p = variablePrompt(vars);
    if (p.show()){
      const data = promptDataForVars(p, vars);
      const preparedText = replaceVariables(vars, text);
      const template = MustacheTemplate.createWithTemplate(preparedText);
      output = template.render(data);
    }
    else {
      context.cancel('Variable prompt canceled');
    }
  }
  
  return output;
};



// Extract mustache variables from input text
const mustacheVars = text => {
  const varRegex = /{{((?:(date|bool):)?(#|^)?(\w+)\??([+|-]\d+[d|w|m])?)}}/g;
  const varMatches = text.matchAll(varRegex);
  // generate a mustache-compatible key without our extensions (type, offset)
  const extractKeyName = instance => {
    const tokenizeOffset = R.pipe(
      R.replace('+', '_offset_forward_'),
      R.replace('-', '_offset_backwards_')
    );
    let key = instance.data;
    if (instance.type){
      key = key.replace(`${instance.type}:`, '');
    }
    if (instance.offset){
      key = key.replace(instance.offset, tokenizeOffset(instance.offset));
    }
    return key;
  };
  // create an instance object based on match groups from regex
  const getInstance = match => {
    let instance = {
      'string': match[0], // full match
      'data': match[1], // data inside {{ }}
      'type': match[2],
      'modifier': match[3],
      'name': match[4],
      'offset': match[5]
    };
    instance['key'] = extractKeyName(instance);
    return instance;
  };
  let vars = {};

  for (match of varMatches) {
    let instance = getInstance(match);
    vars[instance.name] ??= {'instances': []}; // create variable entry if needed
    vars[instance.name].instances.push(instance);
    vars[instance.name].type ??= instance.type; // set type if not already set
    vars[instance.name].modifier ??= instance.modifier; // set modifier if not already set
  }
  
  return vars;
};

// Create a prompt to collect data for a number of variables
// use the 'type' property on a variable to use the most 
// appropriate control for intput
const variablePrompt = vars => {
  const p = Prompt.create();

  Object.entries(vars).forEach(([name, variable]) => {  
    if (variable.type == "date") {
      p.addDatePicker(name, name, new Date(), {mode: "date"});
    } 
    else if (variable.type == "bool") {
      p.addSwitch(name, name, false);
    }
    else {
      p.addTextField(name, name, "");
    }
  });
  p.addButton("OK");
  
  return p;
};

// Generate data based on prompt input for a set of variables
const promptDataForVars = (p, vars) => {
  let data = {};
  
  for (key in p.fieldValues) {
    let fieldValue = p.fieldValues[key];
    if (fieldValue instanceof Date) {
      data[key] = shortDate(fieldValue);
      vars[key].instances.forEach(instance => {
        // for instances with offset dates, calculate offset date
        if (instance.offset){
          const newDate = offsetDate(fieldValue, instance.offset);
          data[instance.key] = shortDate(newDate);
        }
      });
    } 
    else if ((typeof fieldValue == 'string') &&
              fieldValue.includes(',') &&
              (vars[key].modifier == '#')) {
      // process it as a comma separated list
      data[key] = fieldValue.split(',').map(s => s.trim());
    } 
    else {
      data[key] = fieldValue;
    }
  }
  return data;
};

// replace variables with their sanitized key names
// in preparation for processing as a mustache template
const replaceVariables = (vars, text) => {
  let output = text;
  Object.values(vars).forEach(variable => {
     Object.values(variable.instances).forEach( instance => {
      output = output.replace(instance.string, `{{${instance.key}}}`);
    });
  });
  return output;
}