"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname,"..");
const load = (relative) => fs.readFileSync(path.join(root,relative),"utf8");

function classes(initial = []) {
  const present = new Set(initial);
  return {
    contains: name => present.has(name),
    add: name => present.add(name),
    remove: name => present.delete(name),
    toggle: (name, active) => active ? present.add(name) : present.delete(name)
  };
}

test("transparent desktop captures tour controls and releases capture after dismissal", () => {
  let visible = false;
  let poll;
  const modes = [];
  const overlay = {
    closest: (selector) => selector.includes(".bockis-panel-tour") ? overlay : null,
    getBoundingClientRect: () => ({left:0, top:0, right:1200, bottom:800})
  };
  const document = {
    body: {classList: classes()},
    visibilityState:"visible",
    elementsFromPoint: () => visible ? [overlay] : [],
    querySelectorAll: selector => visible && selector.includes(".bockis-panel-tour") ? [overlay] : [],
    querySelector: selector => visible && selector.includes(".bockis-panel-tour") ? overlay : null,
    addEventListener() {}
  };
  const window = {
    edex: {setMouseIgnore: mode => modes.push(mode), getCursorClientPoint: () => ({x:500,y:700})},
    addEventListener() {}
  };
  vm.runInNewContext(load("src/panels/panel-registry.js"), {
    window,document,clearInterval(){},setInterval(fn){poll=fn;return 1}
  }, {filename:"panel-registry.js"});
  const registry = window.edexRendererPanels;
  assert.equal(registry.pointHitsHud(500,700),false);
  registry.setupDesktopClickThrough();
  assert.equal(modes.at(-1),true,"desktop should start click-through");
  visible=true;
  assert.equal(registry.pointHitsHud(500,700),true,"panel tour must be a hit target");
  poll();
  assert.equal(modes.at(-1),false,"tour card clicks must be delivered to Electron");
  visible=false;
  poll();
  assert.equal(modes.at(-1),true,"desktop click-through must return after tour closes");
});

test("tour explicitly holds mouse input, skip releases it, and highlighted panel remains readable", () => {
  let currentRoot;
  const modes = [];
  const buttons = new Map();
  const document = {
    activeElement: null,
    body: {
      classList: classes(),
      append(node){currentRoot=node;node.isConnected=true}
    },
    querySelector(){return null},
    getElementById(){return null},
    createElement(name){
      return {
        tagName:name.toUpperCase(),
        classList:classes(),
        style:{},
        isConnected:false,
        append(){},
        setAttribute(){},
        remove(){this.isConnected=false},
        set innerHTML(html){
          buttons.clear();
          for(const key of ["skip","next"]){
            const listeners={};
            buttons.set(key,{
              disabled:false,
              addEventListener(type,fn){listeners[type]=fn},
              click(){listeners.click?.()}, focus(){}
            });
          }
        },
        querySelector(selector){
          const match=selector.match(/^\[data-(skip|next)\]$/);
          return match ? buttons.get(match[1]) : null;
        },
        querySelectorAll(){return []}
      };
    },
    addEventListener(){},removeEventListener(){}
  };
  const panel={isConnected:true,getBoundingClientRect:() => ({left:100,top:100,right:420,bottom:400,width:320,height:300})};
  const window={
    edex:{setMouseIgnore: ignore => modes.push(ignore)},
    edexPanelTourProfiles:{weather:{steps:[{id:"intro",titleKey:"test.title",descriptionKey:"test.body",target:"panel"}]}},
    edexI18n:{t:key=>key},
    addEventListener(){},removeEventListener(){}
  };
  vm.runInNewContext(load("src/panel-tour/panel-tour.js"), {window,document,innerWidth:1200,innerHeight:800,console,Event}, {filename:"panel-tour.js"});
  assert.equal(window.edexPanelTour.show("weather",()=>panel),true);
  assert.deepEqual(modes,[false],"tour must immediately disable click-through");
  assert.equal(document.body.classList.contains("is-ui-hold"),true);
  assert.equal(currentRoot.classList.contains("panel-tour-no-target"),false);
  buttons.get("skip").click();
  assert.equal(window.edexPanelTour.isRunning(),false);
  assert.equal(document.body.classList.contains("is-ui-hold"),false);
  assert.equal(currentRoot.isConnected,false);
  // The primary "Weiter" action must work in exactly the same capture state.
  assert.equal(window.edexPanelTour.show("weather",()=>panel),true);
  buttons.get("next").click();
  assert.equal(window.edexPanelTour.isRunning(),false);
  assert.equal(document.body.classList.contains("is-ui-hold"),false);
  // If another modal owns the hold, closing the guide must preserve it.
  document.body.classList.add("is-ui-hold");
  assert.equal(window.edexPanelTour.show("weather",()=>panel),true);
  buttons.get("skip").click();
  assert.equal(document.body.classList.contains("is-ui-hold"),true);
  document.body.classList.remove("is-ui-hold");
  const css=load("src/panel-tour/panel-tour.css");
  assert.match(css,/\.bockis-panel-tour\{[^}]*background:transparent/);
  assert.match(css,/\.panel-tour-no-target\{background:rgba/);
});
