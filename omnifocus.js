// https://github.com/edgauthier/drafts
require('drafts.js');

// Modified for reuse from https://polymaths.blog/2020/12/things-parser-3-for-drafts

const processTaskPaperToOmniFocus = (text, target = null) => {
  let cb = processTaskPaperToOmniFocusURL(text, target);
  if (cb){
    let success = cb.open();
    if (success){
      app.openURL(cb.callbackResponse['result'])
    }
    else{
      console.log(cb.status)
      if (cb.status == 'cancelled'){
        context.cancel();
      }
      else{
        context.fail();
      }
    }
  }
};

const processTaskPaperToOmniFocusURL = (text, target = null) => {
  // process for mustache variables
  let input = mustachePrompt(text);

  if (!input){
    return;
  }

  // process any drafts template tags
  input = draft.processTemplate(input);
  
  let cb = CallbackURL.create();
  cb.baseURL = 'omnifocus:///paste';
  cb.waitForResponse = true;
  if (target){
    cb.addParameter('target', target);
  }
  cb.addParameter('content', input);
  return cb;  
};