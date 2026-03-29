import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('dinEditorApp', {
    platform: process.platform,
    runtime: 'electron',
});
