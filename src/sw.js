const debug = true; 
if(debug) console.info("sw.js")

/*
* Filter events
* Use APIs that support event filters to restrict listeners to the cases the extension cares about. If an extension is listening for the tabs.onUpdated event, 
* try using the webNavigation.onCompleted event with filters instead, as the tabs API does not support filters.
* https://developer.chrome.com/docs/extensions/reference/events/#type-UrlFilter
*/
// Normal Filter Object
const filter = {
  url: [
    {
      urlMatches: 'https://*.myshopify.com/*"'
    }
  ]
};

/* Get Current Tab method
*  usage e.g: let currentTab = await getCurrentTab();
*  calling function must be async
*  whilst there can only be 1 current tab, the chrome.tabs.query method can return an array of tabs
*/
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}
/* Get Tab by Id method
*  usage e.g: let currentTab = await getCurrentTab();
*  calling function must be async
*/
async function getTabById(id) {
  let tab = await chrome.tabs.get(id);
  return tab;
}

/*
Initialize the extension
Listen to the runtime.onInstalled event to initialize an extension on installation. Use this event to set a state or for one-time initialization, such as a context menu.
*/
chrome.runtime.onInstalled.addListener(() => {
  if(debug) console.info("sw.js->chrome.runtime.onInstalled [INSTALLED]")
});


/*
* Navigation event listener - see https://developer.chrome.com/docs/extensions/reference/webNavigation/#event-onCompleted
* onBeforeNavigate -> onCommitted -> [onDOMContentLoaded] -> onCompleted
* onHistoryStateUpdated
*/
chrome.webNavigation.onCompleted.addListener( navigationCompleted, filter );
/*
details {
  frameId: number,
  parentFrameId: number,
  processId: number,
  tabId: number,
  timeStamp: number,
  url: string
}
*/
async function navigationCompleted(details) {
  if(debug) console.info(`sw.js->chrome.webNavigation.onCompleted filter:"${details.url}" [COMPLETED MATCHED URL]`);
  const tab = await getTabById(details.tabId);
  // Update icon on URL match
  //chrome.action.setIcon({path: 'https://www.nytimes.com/games/wordle/wordle_logo_144x144.png'});
}


/*
Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events so as to be notified when a URL is set.

See tabs API: https://developer.chrome.com/docs/extensions/reference/tabs/
*/
chrome.tabs.onActivated.addListener(tabActivated);
async function tabActivated(activeInfo) {
  let currentTab = await getCurrentTab();
  if(debug) console.info(`sw.js->chrome.tabs.onActivated tab:${activeInfo.tabId} window:${activeInfo.windowId} status:${currentTab.status} title:"${currentTab.title}" url:${currentTab.url}`);
}

chrome.tabs.onUpdated.addListener(tabUpdated);
async function tabUpdated(tabId, changeInfo, tab) {
  if(debug) {
    console.group(`sw.js->chrome.tabs.onUpdated`);
    console.table({
      tab: tabId, 
      window: tab.windowId, 
      status: tab.status, 
      title: (tab.status == 'loading' && tab.title.indexOf('http')) == 0 ? '' : tab.title, 
      url: tab.url
    });
    console.table(changeInfo);
    console.groupEnd();
  }
  if (tab.status == 'loading') {
    //remove badge, make disabled
    chrome.action.setBadgeBackgroundColor({color: [0, 0, 0, 0]});
    chrome.action.setBadgeText({ text: '' });
    chrome.action.disable({ tabId: tabId });
  }
}



/*
The lifetime of a background service worker is observable by monitoring when an entry for the extension appears and disappears from Chrome's task manager.
Open the task manager by clicking the Chrome Menu, hovering over more tools and selecting "Task Manager".
*/

/*
Service workers unload on their own after a few seconds of inactivity. If any last minute cleanup is required, listen to the runtime.onSuspend event.
*/
chrome.runtime.onSuspend.addListener(() => {
  if(debug) console.log("sw.js->chrome.runtime.onSuspend [UNLOADING]");
  //chrome.browserAction.setBadgeText({text: ""});
});
//However, persisting data in the storage API should be preferred over relying on runtime.onSuspend. It doesn't allow for as much cleanup as may be needed and will not help in case of a crash.

