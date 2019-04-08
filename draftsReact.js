// draftsReact

// Babel for transpiling JSX
require('babel.min.js');

const parseJsxDraft = d => {
  const 
    opts = {presets: ['stage-2', 'react']},
    jsxToJs = input => Babel.transform(input, opts).code;

  return d ? jsxToJs(d.content) : '';
};

const taggedJsx = tag => {
  const 
    tags = ['jsx', tag],
    ds = Draft.query('', 'all', tags),
    combineJsx = R.pipe(
      R.map(parseJsxDraft),
      R.join('\n')
    );
  return combineJsx(ds);
};

const taggedCss = tag => {
  const 
    tags = ['css', tag],
    ds = Draft.query('', 'all', tags),
    combineCss = R.pipe(
      R.map(d => d.content),
      R.join('\n')
    );
  return combineCss(ds);
};

const runReact = (tag, title, data) => {
  const props = {
    title,
    data: dataToJS(data),
    css: taggedCss(tag),
    reactApp: taggedJsx(tag),
    imports: R.join('\n', [
      readLib('ramda.js'),
      readLib('react.min.js'),
      readLib('react-dom.min.js'),
    ])
  };
  
  const
    t = '[[template|react_html.txt]]',
    d = templateDraft(t, props);
    
  previewHtmlDraft(d);
};