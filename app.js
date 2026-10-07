const STORAGE_KEY='book-builder-project-v1';

const defaultProject=()=>({
  book:{
    title:"The Ones I'll Never Forget",
    subtitle:"",
    author:"",
    trim:"6x9",
    fontSize:"11"
  },
  chapters:[
    {
      id:crypto.randomUUID(),
      title:"Fireworks at Freedom Park",
      meta:"November 26, 2024",
      blocks:[
        {id:crypto.randomUUID(),type:"paragraph",text:"On Tuesday evening, I went soulwinning with Bro. Nico Barranco and Bro. John Paul Villavito at Freedom Park. We saw a total of four souls saved that evening, but I had one experience that I’ll never forget."},
        {id:crypto.randomUUID(),type:"paragraph",text:"As we circled the fountain looking for someone to share the Gospel with, I saw a college-aged lady sitting alone with her back toward the capitol building. I hesitated to talk to her at first because I prefer talking to men, but thankfully, I listened to the Spirit’s leading."},
        {id:crypto.randomUUID(),type:"note",heading:"A small hesitation can become a missed opportunity",body:"Sometimes the hardest part is simply deciding to walk over and speak. The opportunity may disappear before the fear does.",align:"right"},
        {id:crypto.randomUUID(),type:"paragraph",text:"I approached her, offered her a tract, and invited her to church. After introducing myself and my partners, I found out her name was Jenny and that she was a first-year college student at NORSU."}
      ]
    }
  ]
});

let project=loadProject();
let activeChapterId=project.chapters[0]?.id||null;
let saveTimer=null;

const $=sel=>document.querySelector(sel);
const els={
  bookTitle:$('#bookTitle'),bookSubtitle:$('#bookSubtitle'),bookAuthor:$('#bookAuthor'),
  chapterList:$('#chapterList'),chapterCount:$('#chapterCount'),
  chapterTitle:$('#chapterTitle'),chapterMeta:$('#chapterMeta'),
  blockEditor:$('#blockEditor'),bookPreview:$('#bookPreview'),
  trimSize:$('#trimSize'),fontSize:$('#fontSize'),saveStatus:$('#saveStatus'),
  paragraphTemplate:$('#paragraphTemplate'),noteTemplate:$('#noteTemplate')
};

function loadProject(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return raw?JSON.parse(raw):defaultProject();
  }catch{
    return defaultProject();
  }
}
function queueSave(){
  els.saveStatus.textContent='Saving…';
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(project));
    els.saveStatus.textContent='Saved';
  },250);
}
function activeChapter(){return project.chapters.find(c=>c.id===activeChapterId)}
function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function paragraphsFromText(text=''){
  return text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
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
    main.onclick=()=>{activeChapterId=c.id;renderAll()};
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
      if(activeChapterId===c.id)activeChapterId=project.chapters[Math.min(i,project.chapters.length-1)]?.id||null;
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
    els.chapterTitle.value='';els.chapterMeta.value='';
    els.blockEditor.innerHTML='<div class="empty-state">Create a chapter to begin.</div>';
    return;
  }
  els.chapterTitle.value=chapter.title||'';
  els.chapterMeta.value=chapter.meta||'';
  els.blockEditor.innerHTML='';
  chapter.blocks.forEach((block,index)=>{
    const node=(block.type==='note'?els.noteTemplate:els.paragraphTemplate).content.firstElementChild.cloneNode(true);
    node.dataset.id=block.id;
    if(block.type==='paragraph'){
      const ta=node.querySelector('textarea');
      ta.value=block.text||'';
      ta.addEventListener('input',()=>{block.text=ta.value;queueSave();renderPreview()});
    }else{
      const heading=node.querySelector('.note-heading');
      const body=node.querySelector('.note-body');
      const align=node.querySelector('.note-align');
      heading.value=block.heading||'';
      body.value=block.body||'';
      align.value=block.align||'right';
      heading.addEventListener('input',()=>{block.heading=heading.value;queueSave();renderPreview()});
      body.addEventListener('input',()=>{block.body=body.value;queueSave();renderPreview()});
      align.addEventListener('change',()=>{block.align=align.value;queueSave();renderPreview()});
    }
    node.querySelectorAll('[data-action]').forEach(btn=>{
      btn.onclick=()=>{
        const action=btn.dataset.action;
        if(action==='delete'){chapter.blocks.splice(index,1)}
        if(action==='up'&&index>0){[chapter.blocks[index-1],chapter.blocks[index]]=[chapter.blocks[index],chapter.blocks[index-1]]}
        if(action==='down'&&index<chapter.blocks.length-1){[chapter.blocks[index+1],chapter.blocks[index]]=[chapter.blocks[index],chapter.blocks[index+1]]}
        queueSave();renderAll();
      };
    });
    els.blockEditor.appendChild(node);
  });
}
function trimVars(){
  const trim=project.book.trim||'6x9';
  const map={'6x9':['6in','9in'],'5.5x8.5':['5.5in','8.5in'],'5x8':['5in','8in']};
  const [w,h]=map[trim]||map['6x9'];
  document.documentElement.style.setProperty('--page-w',w);
  document.documentElement.style.setProperty('--page-h',h);
  document.documentElement.style.setProperty('--body-size',(project.book.fontSize||'11')+'pt');
}
function makePage(className=''){
  const page=document.createElement('div');page.className='page '+className;return page;
}
function renderPreview(){
  trimVars();
  els.bookPreview.innerHTML='';
  const title=makePage('title-page');
  title.innerHTML='<h1>'+escapeHtml(project.book.title||'Untitled Book')+'</h1>'+
    (project.book.subtitle?'<div class="subtitle">'+escapeHtml(project.book.subtitle)+'</div>':'')+
    (project.book.author?'<div class="author">'+escapeHtml(project.book.author)+'</div>':'');
  els.bookPreview.appendChild(title);

  let pageNo=1;
  project.chapters.forEach((chapter,idx)=>{
    const page=makePage('chapter-page');
    const h=document.createElement('h2');h.className='print-title';h.textContent=chapter.title||'Untitled Chapter';page.appendChild(h);
    if(chapter.meta){const meta=document.createElement('div');meta.className='print-meta';meta.textContent=chapter.meta;page.appendChild(meta)}
    chapter.blocks.forEach((block,bidx)=>{
      if(block.type==='note'){
        const note=document.createElement('aside');
        note.className='print-note '+(block.align==='left'?'left':'');
        note.innerHTML='<h4>'+escapeHtml(block.heading||'Side Note')+'</h4><p>'+escapeHtml(block.body||'')+'</p>';
        page.appendChild(note);
      }else{
        paragraphsFromText(block.text).forEach((p,pidx)=>{
          const el=document.createElement('p');
          el.className='print-paragraph'+((bidx===0&&pidx===0)?' no-indent':'');
          el.textContent=p;
          page.appendChild(el);
        });
      }
    });
    const pn=document.createElement('div');pn.className='page-number';pn.textContent=pageNo++;page.appendChild(pn);
    els.bookPreview.appendChild(page);
  });
}

function addChapter(){
  const c={id:crypto.randomUUID(),title:'Untitled Chapter',meta:'',blocks:[{id:crypto.randomUUID(),type:'paragraph',text:''}]};
  project.chapters.push(c);activeChapterId=c.id;queueSave();renderAll();
  setTimeout(()=>els.chapterTitle.select(),0);
}
function addBlock(type){
  const c=activeChapter();if(!c)return;
  c.blocks.push(type==='note'
    ?{id:crypto.randomUUID(),type:'note',heading:'',body:'',align:'right'}
    :{id:crypto.randomUUID(),type:'paragraph',text:''});
  queueSave();renderAll();
  setTimeout(()=>els.blockEditor.lastElementChild?.querySelector('textarea,input')?.focus(),0);
}
function exportProject(){
  const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  const safe=(project.book.title||'book-project').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
  a.download=safe+'.json';a.click();URL.revokeObjectURL(a.href);
}
function importProject(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      if(!parsed.book||!Array.isArray(parsed.chapters))throw new Error();
      project=parsed;activeChapterId=project.chapters[0]?.id||null;queueSave();renderAll();
    }catch{alert('That file is not a valid Book Builder project.')}
  };
  reader.readAsText(file);
}

$('#newChapterBtn').onclick=addChapter;
$('#addParagraphBtn').onclick=()=>addBlock('paragraph');
$('#addNoteBtn').onclick=()=>addBlock('note');
$('#exportProjectBtn').onclick=exportProject;
$('#importProjectInput').onchange=e=>e.target.files[0]&&importProject(e.target.files[0]);
$('#resetBtn').onclick=()=>{if(confirm('Reset the app and erase the locally saved manuscript?')){project=defaultProject();activeChapterId=project.chapters[0].id;queueSave();renderAll()}};
$('#exportPdfBtn').onclick=()=>window.print();

els.bookTitle.addEventListener('input',()=>{project.book.title=els.bookTitle.value;queueSave();renderPreview()});
els.bookSubtitle.addEventListener('input',()=>{project.book.subtitle=els.bookSubtitle.value;queueSave();renderPreview()});
els.bookAuthor.addEventListener('input',()=>{project.book.author=els.bookAuthor.value;queueSave();renderPreview()});
els.chapterTitle.addEventListener('input',()=>{const c=activeChapter();if(c){c.title=els.chapterTitle.value;queueSave();renderSidebar();renderPreview()}});
els.chapterMeta.addEventListener('input',()=>{const c=activeChapter();if(c){c.meta=els.chapterMeta.value;queueSave();renderPreview()}});
els.trimSize.addEventListener('change',()=>{project.book.trim=els.trimSize.value;queueSave();renderPreview()});
els.fontSize.addEventListener('change',()=>{project.book.fontSize=els.fontSize.value;queueSave();renderPreview()});

renderAll();
