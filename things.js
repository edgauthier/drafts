// https://github.com/edgauthier/drafts
require('drafts.js');
require('birchoutline.js');

// Modified for reuse from https://polymaths.blog/2020/12/things-parser-3-for-drafts

const processTaskPaperToThings = text => {
  let cb = processTaskPaperToThingsURL(text);
  if (cb){
    cb.addParameter('reveal', true);
    app.openURL(cb.url);
  }
};

const processTaskPaperToThingsURL = text => {
  // process for mustache variables
  let input = mustachePrompt(text);  
  
  // process any drafts template tags
  input = draft.processTemplate(input);

  // Nothing to do if we don't have any input
  if (!input){
    return;
  }

  const outline = new birchoutline.Outline.createTaskPaperOutline(input);
  let todos = [];

  outline.root.children.forEach(child => {
    if (child.getAttribute('data-type') == 'project') {
      todos.push(processProject(child));
    } 
    else if (child.getAttribute('data-type') == 'task') {
      todos.push(processTask(child));
    }
  });

  // nothing to do if there were not tasks in the input
  if (todos.length == 0){
    return;
  }

  const container = TJSContainer.create(todos);
  let cb = CallbackURL.create();
  cb.baseURL = container.url;
  return cb;  
};

// Helper functions for processing outline content
const trimmedContent = item => item.bodyContentString.trim();
const isCompleted = item => item.hasAttribute('data-completed') || item.hasAttribute('data-done');
const isCanceled = item => item.hasAttribute('data-canceled') || item.hasAttribute('data-cancelled');
const isArchived = item => item.hasAttribute('data-archived') || item.hasAttribute('data-done');
const getWhen = item => item.getAttribute('data-when') || item.getAttribute('data-defer');
const getDeadline = item => item.getAttribute('data-deadline') || item.getAttribute('data-due');
const getHeading = item => item.getAttribute('data-heading');
const getList = item => item.getAttribute('data-list') || item.getAttribute('data-project');
const getListID = item => item.getAttribute('data-listID') || item.getAttribute('data-listid');
const getArea = item => item.getAttribute('data-area');
const getAreaID = item => item.getAttribute('data-areaID') || item.getAttribute('data-areaid');
const getTags = item => {
  let tags = null;
  if (item.hasAttribute('data-tag')) {
    tags = [item.getAttribute('data-tag')];
  } 
  else if (item.hasAttribute('data-tags')) {
    tags = item.getAttribute('data-tags').split(',').map(t => t.trim());
  }
  return tags;
};
const getNotes = item => {
  let notes = [];
  item.children.forEach(child => {
    if (child.getAttribute('data-type') == 'note'){
      notes.push(trimmedContent(child));
    }
  });
  return notes.join('\n');
}

const processSubTask = item => {
  let subtask = TJSChecklistItem.create();
  subtask.title = trimmedContent(item);
  subtask.canceled = isCanceled(item);
  subtask.completed = isCompleted(item);
  return subtask;
};

function processTask(item) {
  let todo = TJSTodo.create();
  todo.title = trimmedContent(item);
  todo.when = getWhen(item);
  todo.deadline = getDeadline(item);
  todo.canceled = isCanceled(item);
  todo.completed = isCompleted(item);
  todo.heading = getHeading(item);
  todo.tags = getTags(item);
  todo.notes = getNotes(item);

  const list = getList(item), listID = getListID(item);

  if (list){
    todo.list = list;
  }
  if (listID){
    todo.listID = listID;
  }

  item.children.forEach(child => {    
    if (child.getAttribute('data-type') == 'task') {
     todo.addChecklistItem(processSubTask(child));
    }
  });
  
  return todo;
};

const processHeading = item => {
  let heading = TJSHeading.create();
  heading.title = trimmedContent(item);
  heading.archived = isArchived(item);
  return heading;
};

const processProject = item => {
  let project = TJSProject.create();
  project.title = trimmedContent(item);
  project.when = getWhen(item);
  project.deadline = getDeadline(item);  
  project.canceled = isCanceled(item);
  project.completed = isCompleted(item);
  project.tags = getTags(item);
  project.notes = getNotes(item);

  const area = getArea(item), areaID = getAreaID(item);

  if (area) {
    project.area = area;
  }
  if (areaID){
    project.areaID = areaID;
  }
    
  item.children.forEach(child => {
    if (child.getAttribute('data-type') == 'task') {
      project.addTodo(processTask(child));
    } 
    else if (child.getAttribute('data-type') == 'project') {
      let heading = processHeading(child);
      project.addHeading(heading);

      child.children.forEach(grandchild => {
        if (grandchild.getAttribute('data-type') == 'task') {
          let todo = processTask(grandchild);
          todo.heading = heading.title;
          project.addTodo(todo);
        }
      });
    }
  });

  return project;
};