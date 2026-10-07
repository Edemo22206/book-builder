const STORAGE_KEY='book-builder-project-v1';

const uid=()=>crypto.randomUUID();
const defaultProject=()=>({
  version:2,
  book:{
    title:"The Ones I'll Never Forget",
    subtitle:"",
    author:"",
    trim:"6x9",
    fontSize:"11"
  },
  chapters:[
    {id:uid(),title:"Untitled Chapter",meta:"",body:"",notes:[]}
  ]
});

function migrateProject(data){
  if(!data || !data.book || !Array.isArray(data.chapters)) return defaultProject();
  if(data.version===2 && data.chapters.every(c=>typeof c.body==='string')) return data;
  const migrated={
    version:2,
    book:{...defaultProject().book,...data.book},
    chapters:data.chapters.map(ch=>{
      if(typeof ch.body==='string') return {...ch,notes:Array.isArray(ch.notes)?ch.notes:[]};
      let paragraphCount=0;
      const bodyParts=[];
      const notes=[];
      for(const block of (ch.blocks||[])){
        if(block.type==='paragraph'){
          const ps=paragraphsFromText(block.text||'');
          bodyParts.push(...ps);
          paragraphCount+=ps.length;
        }else if(block.type==='note'){
          notes.push({
            id:block.id||uid(),
            heading:block.heading||'',
            body:block.body||'',
            afterParagraph:Math.max(0,paragraphCount),
            align:block.align||'right'
          });
        }
      }
      return {id:ch.id||uid(),title:ch.title||'Untitled Chapter',meta:ch.meta||'',body:bodyParts.join('\n\n'),notes};
    })
  };
  return migrated;
}

function loadProject(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return raw?migrateProject(JSON.parse(raw)):defaultProject();
  }catch{
    return defaultProject();
  }
}

let project=loadProject();
let activeChapterId=project.chapters[0]?.id||null;
let saveTimer=null;
let previewTimer=null;

const $=sel=>document.querySelector(sel);
const els={
  bookTitle:$('#bookTitle'),bookSubtitle:$('#bookSubtitle'),bookAuthor:$('#bookAuthor'),
  chapterList:$('#chapterList'),chapterCount:$('#chapterCount'),
  chapterTitle:$('#chapterTitle'),chapterMeta:$('#chapterMeta'),chapterBody:$('#chapterBody'),
  notesEditor:$('#notesEditor'),noteTemplate:$('#noteTemplate'),
  bookPreview:$('#bookPreview'),trimSize:$('#trimSize'),fontSize:$('#fontSize'),
  saveStatus:$('#saveStatus'),pageCount:$('#pageCount'),dynamicPageStyle:$('#dynamicPageStyle')
};

function paragraphsFromText(text=''){
  return text.replace(/\r/g,'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
}
function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
}
function activeChapter(){return project.chapters.find(c=>c.id===activeChapterId)}
function queueSave(){
  els.saveStatus.textContent='Saving…';
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    project.version=2;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(project));
    els.saveStatus.textContent='Saved';
  },220);
}
function schedulePreview(){
  clearTimeout(previewTimer);
  previewTimer=setTimeout(renderPreview,90);
}
function renderAll(){
  renderSidebar();
  renderEditor();
  renderPreview();
}
function renderSidebar(){
  els.bookTitle.value=project.book.title||'';
  els.bookSubtitle.value=project.book.subtitle||'';
  els.bookAuthor.value=project.book.author||'';
  els.trimSize.value=project.book.trim||'6x9';
  els.fontSize.value=project.book.fontSize||'11';
  els.chapterCount.textContent=project.chapters.length;
  els.chapterList.innerHTML='';
  project.chapters.forEach((c,i)=>{
    const item=document.createElement('div');
    item.className='chapter-item'+(c.id===activeChapterId?' active':'');
    const main=document.createElement('div');
    main.className='chapter-item-main';
    main.innerHTML='<div class="chapter-item-title">'+escapeHtml(c.title||'Untitled Chapter')+'</div><div class="chapter-item-num">Chapter '+(i+1)+'</div>';
    main.onclick=()=>{activeChapterId=c.id;closeMobileSidebar();renderAll()};
    const actions=document.createElement('div');
    actions.className='chapter-item-actions';
    const up=document.createElement('button');up.textContent='↑';up.title='Move chapter up';up.disabled=i===0;
    const down=document.createElement('button');down.textContent='↓';down.title='Move chapter down';down.disabled=i===project.chapters.length-1;
    const del=document.createElement('button');del.textContent='×';del.title='Delete chapter';
    up.onclick=()=>{if(i>0){[project.chapters[i-1],project.chapters[i]]=[project.chapters[i],project.chapters[i-1]];queueSave();renderAll()}};
    down.onclick=()=>{if(i<project.chapters.length-1){[project.chapters[i+1],project.chapters[i]]=[project.chapters[i],project.chapters[i+1]];queueSave();renderAll()}};
    del.onclick=()=>{
      if(!confirm('Delete this chapter?'))return;
      project.chapters.splice(i,1);
      if(activeChapterId===c.id) activeChapterId=project.chapters[Math.min(i,project.chapters.length-1)]?.id||null;
      queueSave();renderAll();
    };
    actions.append(up,down,del);
    item.append(main,actions);
    els.chapterList.appendChild(item);
  });
}
function renderEditor(){
  const chapter=activeChapter();
  if(!chapter){
    els.chapterTitle.value='';
    els.chapterMeta.value='';
    els.chapterBody.value='';
    els.notesEditor.innerHTML='<div class="empty-state">Create a chapter to begin.</div>';
    return;
  }
  els.chapterTitle.value=chapter.title||'';
  els.chapterMeta.value=chapter.meta||'';
  els.chapterBody.value=chapter.body||'';
  renderNotes();
}
function renderNotes(){
  const chapter=activeChapter();
  els.notesEditor.innerHTML='';
  if(!chapter) return;
  if(!chapter.notes.length){
    els.notesEditor.innerHTML='<div class="empty-state">No side notes yet. Add them only where they strengthen the story.</div>';
    return;
  }
  const paragraphTotal=paragraphsFromText(chapter.body).length;
  chapter.notes.forEach((note,index)=>{
    const node=els.noteTemplate.content.firstElementChild.cloneNode(true);
    const heading=node.querySelector('.note-heading-input');
    const body=node.querySelector('.note-body-input');
    const anchor=node.querySelector('.note-anchor-input');
    const align=node.querySelector('.note-align-input');
    heading.value=note.heading||'';
    body.value=note.body||'';
    anchor.value=Math.min(Math.max(Number(note.afterParagraph)||0,0),paragraphTotal);
    anchor.max=paragraphTotal;
    align.value=note.align||'right';
    heading.oninput=()=>{note.heading=heading.value;queueSave();schedulePreview()};
    body.oninput=()=>{note.body=body.value;queueSave();schedulePreview()};
    anchor.oninput=()=>{note.afterParagraph=Math.max(0,Math.min(Number(anchor.value)||0,paragraphTotal));queueSave();schedulePreview()};
    align.onchange=()=>{note.align=align.value;queueSave();schedulePreview()};
    node.querySelector('.note-delete').onclick=()=>{
      chapter.notes.splice(index,1);queueSave();renderNotes();renderPreview();
    };
    els.notesEditor.appendChild(node);
  });
}
function addNote(){
  const chapter=activeChapter(); if(!chapter)return;
  const count=paragraphsFromText(chapter.body).length;
  chapter.notes.push({id:uid(),heading:'',body:'',afterParagraph:count,align:'right'});
  queueSave();renderNotes();schedulePreview();
  setTimeout(()=>els.notesEditor.lastElementChild?.querySelector('.note-heading-input')?.focus(),0);
}
function addChapter(){
  const c={id:uid(),title:'Untitled Chapter',meta:'',body:'',notes:[]};
  project.chapters.push(c);activeChapterId=c.id;queueSave();renderAll();
  setTimeout(()=>els.chapterTitle.select(),0);
}
function trimVars(){
  const trim=project.book.trim||'6x9';
  const map={'6x9':['6in','9in'],'5.5x8.5':['5.5in','8.5in'],'5x8':['5in','8in']};
  const [w,h]=map[trim]||map['6x9'];
  document.documentElement.style.setProperty('--page-w',w);
  document.documentElement.style.setProperty('--page-h',h);
  document.documentElement.style.setProperty('--body-size',(project.book.fontSize||'11')+'pt');
  els.dynamicPageStyle.textContent='@page{size:'+w+' '+h+';margin:0}';
}
function makePage(className='',pageNo=null){
  const page=document.createElement('div');
  page.className='page '+className;
  const content=document.createElement('div');
  content.className='page-content';
  page.appendChild(content);
  if(pageNo!==null){
    const pn=document.createElement('div');
    pn.className='page-number';
    pn.textContent=pageNo;
    page.appendChild(pn);
  }
  return {page,content};
}
function isOverflowing(content){
  return content.scrollHeight>content.clientHeight+1;
}
function createParagraph(text,{first=false,continued=false}={}){
  const p=document.createElement('p');
  p.className='print-paragraph'+(first?' first-paragraph':'')+(continued?' continued':'');
  p.textContent=text;
  return p;
}
function createNote(note){
  const aside=document.createElement('aside');
  aside.className='print-note '+(note.align==='left'?'left':'');
  aside.innerHTML='<h4>'+escapeHtml(note.heading||'Side Note')+'</h4><p>'+escapeHtml(note.body||'')+'</p>';
  return aside;
}
function fitParagraph(content,text,opts={}){
  const words=text.split(/\s+/).filter(Boolean);
  if(!words.length) return {placed:true,remainder:''};
  const full=createParagraph(text,opts);
  content.appendChild(full);
  if(!isOverflowing(content)) return {placed:true,remainder:''};
  full.remove();

  let lo=1,hi=words.length,best=0;
  while(lo<=hi){
    const mid=Math.floor((lo+hi)/2);
    const probe=createParagraph(words.slice(0,mid).join(' '),opts);
    content.appendChild(probe);
    const fits=!isOverflowing(content);
    probe.remove();
    if(fits){best=mid;lo=mid+1}else{hi=mid-1}
  }
  if(best===0) return {placed:false,remainder:text};
  if(words.length-best<8 && best>12) best=Math.max(12,best-8);
  const part=createParagraph(words.slice(0,best).join(' '),opts);
  content.appendChild(part);
  return {placed:true,remainder:words.slice(best).join(' ')};
}
function notesForAnchor(chapter,anchor){
  return (chapter.notes||[]).filter(n=>Math.max(0,Number(n.afterParagraph)||0)===anchor);
}
function paginateChapter(chapter,startPageNo,measureRoot){
  const output=[];
  let pageNo=startPageNo;
  let current=makePage('chapter-page',pageNo++);
  output.push(current.page);
  measureRoot.appendChild(current.page);

  const heading=document.createElement('div');
  heading.className='chapter-heading';
  const chapterIndex=project.chapters.indexOf(chapter)+1;
  heading.innerHTML='<div class="chapter-kicker">Chapter '+chapterIndex+'</div><h2 class="print-title">'+escapeHtml(chapter.title||'Untitled Chapter')+'</h2>'+
    (chapter.meta?'<div class="print-meta">'+escapeHtml(chapter.meta)+'</div>':'');
  current.content.appendChild(heading);

  const paragraphs=paragraphsFromText(chapter.body);
  let firstParagraph=true;

  const newPage=()=>{
    current=makePage('chapter-page continuation-page',pageNo++);
    output.push(current.page);
    measureRoot.appendChild(current.page);
  };

  const addAnchoredNotes=(anchor)=>{
    for(const note of notesForAnchor(chapter,anchor)){
      const el=createNote(note);
      current.content.appendChild(el);
      if(isOverflowing(current.content)){
        el.remove();
        newPage();
        current.content.appendChild(createNote(note));
      }
    }
  };

  addAnchoredNotes(0);

  paragraphs.forEach((paragraph,pIndex)=>{
    let remainder=paragraph;
    let continuation=false;
    while(remainder){
      const result=fitParagraph(current.content,remainder,{first:firstParagraph&&!continuation,continued:continuation});
      if(!result.placed){
        newPage();
        continuation=true;
        continue;
      }
      remainder=result.remainder;
      firstParagraph=false;
      if(remainder){
        newPage();
        continuation=true;
      }
    }
    addAnchoredNotes(pIndex+1);
  });

  return {pages:output,nextPageNo:pageNo};
}
function renderPreview(){
  trimVars();
  els.bookPreview.innerHTML='';

  document.querySelectorAll('.pagination-sandbox').forEach(el=>el.remove());
  const measureRoot=document.createElement('div');
  measureRoot.className='pagination-sandbox';
  document.body.appendChild(measureRoot);

  const title=makePage('title-page');
  title.page.innerHTML='<h1>'+escapeHtml(project.book.title||'Untitled Book')+'</h1>'+
    (project.book.subtitle?'<div class="subtitle">'+escapeHtml(project.book.subtitle)+'</div>':'')+
    (project.book.author?'<div class="author">'+escapeHtml(project.book.author)+'</div>':'');
  els.bookPreview.appendChild(title.page);

  let pageNo=1;
  let printedPages=0;
  for(const chapter of project.chapters){
    if(!chapter.body.trim() && !(chapter.notes||[]).length && chapter.title==='Untitled Chapter') continue;
    const result=paginateChapter(chapter,pageNo,measureRoot);
    result.pages.forEach(p=>els.bookPreview.appendChild(p));
    printedPages+=result.pages.length;
    pageNo=result.nextPageNo;
  }
  els.pageCount.textContent=printedPages+' story page'+(printedPages===1?'':'s')+' + title page';
  measureRoot.remove();
}
function exportProject(){
  const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const safe=(project.book.title||'book-project').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
  a.download=safe+'.json';a.click();URL.revokeObjectURL(a.href);
}
function importProject(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=migrateProject(JSON.parse(reader.result));
      project=parsed;
      activeChapterId=project.chapters[0]?.id||null;
      queueSave();renderAll();
    }catch{
      alert('That file is not a valid Book Builder project.');
    }
  };
  reader.readAsText(file);
}

$('#newChapterBtn').onclick=addChapter;
$('#addNoteBtn').onclick=addNote;
$('#addNoteInlineBtn').onclick=addNote;
$('#exportProjectBtn').onclick=exportProject;
$('#importProjectInput').onchange=e=>e.target.files[0]&&importProject(e.target.files[0]);
$('#resetBtn').onclick=()=>{
  if(confirm('Reset the app and erase the locally saved manuscript?')){
    project=defaultProject();activeChapterId=project.chapters[0].id;queueSave();renderAll();
  }
};
$('#exportPdfBtn').onclick=()=>{renderPreview();setTimeout(()=>window.print(),120)};

els.bookTitle.oninput=()=>{project.book.title=els.bookTitle.value;queueSave();schedulePreview()};
els.bookSubtitle.oninput=()=>{project.book.subtitle=els.bookSubtitle.value;queueSave();schedulePreview()};
els.bookAuthor.oninput=()=>{project.book.author=els.bookAuthor.value;queueSave();schedulePreview()};
els.chapterTitle.oninput=()=>{const c=activeChapter();if(c){c.title=els.chapterTitle.value;queueSave();renderSidebar();schedulePreview()}};
els.chapterMeta.oninput=()=>{const c=activeChapter();if(c){c.meta=els.chapterMeta.value;queueSave();schedulePreview()}};
els.chapterBody.oninput=()=>{
  const c=activeChapter();if(c){
    c.body=els.chapterBody.value;queueSave();schedulePreview();
  }
};
els.chapterBody.onblur=renderNotes;
els.trimSize.onchange=()=>{project.book.trim=els.trimSize.value;queueSave();renderPreview()};
els.fontSize.onchange=()=>{project.book.fontSize=els.fontSize.value;queueSave();renderPreview()};

const mobileChaptersBtn=$('#mobileChaptersBtn');
const mobilePreviewBtn=$('#mobilePreviewBtn');
const sidebarBackdrop=$('#sidebarBackdrop');
function closeMobileSidebar(){document.body.classList.remove('mobile-sidebar-open')}
mobileChaptersBtn?.addEventListener('click',()=>document.body.classList.toggle('mobile-sidebar-open'));
sidebarBackdrop?.addEventListener('click',closeMobileSidebar);
mobilePreviewBtn?.addEventListener('click',()=>{
  const showing=document.body.classList.toggle('mobile-preview');
  mobilePreviewBtn.textContent=showing?'Editor':'Preview';
  if(showing) renderPreview();
});

renderAll();
queueSave();