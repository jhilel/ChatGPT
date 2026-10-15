const {app,BrowserWindow,Menu,shell}=require('electron');
const path=require('node:path');
let entry,localServer;
if(process.env.RIG_TO_SHOW_USER_DATA)app.setPath('userData',process.env.RIG_TO_SHOW_USER_DATA);
if(process.env.RIG_TO_SHOW_HEADLESS==='1')app.disableHardwareAcceleration();
let window;
function createWindow(){window=new BrowserWindow({width:1400,height:950,minWidth:850,minHeight:650,title:'Rig to Show',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});window.loadURL(entry);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(url!==entry&&url!==entry+'/')event.preventDefault();});window.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));}
app.whenReady().then(async()=>{Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Rig to Show',submenu:[{role:'about'},{label:'Check for releases',click:()=>shell.openExternal('https://github.com/jhilel/ChatGPT/releases')},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));const {createAppServer}=await import('../src/local-ai-server.mjs');const local=createAppServer({port:0,publicRoot:require('node:url').pathToFileURL(path.join(__dirname,'..','public')+path.sep)});localServer=local.server;entry=await local.start();createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('before-quit',()=>localServer?.close());
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
