/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;


import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

// import * as quill from "quill";


import { VisualSettings } from "./settings";
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import { tickStep } from "d3";

// import { getRandomString } from "@pnp/common";

// Rebuild Array equal methods (Tomáš Zato - Reinstate Monica on StackOverFlow)
function areArraysEquals(arrayA, arrayB) {
    // if either array is a falsy value, return
    if (!arrayA) {
        return false;
    };

    if (!arrayB) {
        return false;
    };

    // compare lengths - can save a lot of time
    if (arrayA.lenght != arrayB.lenght) {
        return false
    };

    for (let i = 0; i < arrayA.length; i++) {
        // Check if we have nested arrays
        if (arrayA[i] instanceof Array && arrayB[i] instanceof Array) {
            // recurse into the nested arrays
            if (!arrayA[i].equals(arrayB[i])) {
                return false;
            };
        } else if (arrayA[i] != arrayB[i]) {
            // Warning - two different object instances will never be equal
            return false;
        };
    };
    return true;
};

// Function to create timeout promise (useful if server can not be access => remove long waiting time)
function timeoutPromise(ms:number, promise:Promise<Response>) {
    return new Promise<Response>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Promise TimeOut'));
        }, ms);
        promise.then(
            (res) => {
                clearTimeout(timeoutId);
                resolve(res);
            },
            (err) => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
};

// Send Get request to the server
function getKeyFromServer(visual: Visual, key:string): void {
    // Don't send sample keys
    if (key === '') {
        visual.updateOutput('No Key to Get')
        return;
    };

    // Warning - ethernet and wifi adress change over time ...
    // Need to find a way to catch this.

    let requestPath: string = '/';
    const requestInit: RequestInit = {
        method: 'GET',
    };

    // Get alive server address and send request

    // let local = fetch('http://127.0.0.1:5000/')
    let local: Promise<void | Response> = timeoutPromise(1000, fetch('http://127.0.0.1:5000/'))
    .catch(e => {
        visual.updateOutput(`[Local] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let ethernet: Promise<void | Response> =  timeoutPromise(1000, fetch('http://172.29.134.132:5000/'))
    .catch(e => {
        visual.updateOutput(`[Ethernet] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let wifi: Promise<void | Response> =  timeoutPromise(1000, fetch('http://172.29.146.134:5000/'))
    .catch(e => {
        visual.updateOutput(`[Wifi] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let alive: string = '';
    let aliveStr: string = '';

    Promise.all([local, ethernet, wifi]).then(responses => {
        let resLocal = responses[0];
        let resEthernet = responses[1];
        let resWifi = responses[2];
        if (resLocal && resLocal.ok) {
            alive = 'http://127.0.0.1:5000/';
            aliveStr = 'Local';
            return resLocal.text();  
        } else if (resEthernet && resEthernet.ok) {
            alive = 'http://172.29.134.132:5000/';
            aliveStr = 'Ethernet';
            return resEthernet.text();  
        } else if (resWifi && resWifi.ok) {
            alive = 'http://172.29.146.134:5000/';
            aliveStr = 'Wifi';
            return resWifi.text();  
        };
        throw new Error(`HTTP error! Uncaught at the previous check step.`);
    })
    .then(text => {
        requestPath = `comment/get/${key}`;
        visual.updateOutput(`[${aliveStr}] Alive - ${text}`);
        return fetch(alive + requestPath, requestInit);
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            return response.json();
        };      
    })
    .then(json_response => {
        visual.updateOutput(`[${aliveStr}] Succeed to Get Key: ${key}`);
        visual.updateInput(json_response);
        return;
    })
    .catch(e => {
        visual.updateOutput(`There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
        return;
    });

    return;
};

function postKeyToServer(visual: Visual, key: string, comment:string, method:string): void {
    // Don't post sample keys
    if (key === '') {
        visual.updateOutput('No Key to Post')
        return;
    };

    // Warning - ethernet and wifi adress change over time ...
    // Need to find a way to catch this.

    let requestPath: string = '/';
    const requestInit: RequestInit = {
        method: 'POST',
        body: comment,
    };

    // Get alive server address and send request

    // let local = fetch('http://127.0.0.1:5000/')
    let local: Promise<void | Response> = timeoutPromise(1000, fetch('http://127.0.0.1:5000/'))
    .catch(e => {
        visual.updateOutput(`[Local] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let ethernet: Promise<void | Response> =  timeoutPromise(1000, fetch('http://172.29.134.132:5000/'))
    .catch(e => {
        visual.updateOutput(`[Ethernet] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let wifi: Promise<void | Response> =  timeoutPromise(1000, fetch('http://172.29.146.134:5000/'))
    .catch(e => {
        visual.updateOutput(`[Wifi] There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
    });

    let alive: string = '';
    let aliveStr: string = '';

    Promise.all([local, ethernet, wifi]).then(responses => {
        let resLocal = responses[0];
        let resEthernet = responses[1];
        let resWifi = responses[2];
        if (resLocal && resLocal.ok) {
            alive = 'http://127.0.0.1:5000/';
            aliveStr = 'Local';
            return resLocal.text();  
        } else if (resEthernet && resEthernet.ok) {
            alive = 'http://172.29.134.132:5000/';
            aliveStr = 'Ethernet';
            return resEthernet.text();  
        } else if (resWifi && resWifi.ok) {
            alive = 'http://172.29.146.134:5000/';
            aliveStr = 'Wifi';
            return resWifi.text();  
        };
        throw new Error(`HTTP error! Uncaught at the previous check step.`);
    })
    .then(text => {
        requestPath = `comment/post/${key}/${method}`;
        visual.updateOutput(`[${aliveStr}] Alive - ${text}`);
        return fetch(alive + requestPath, requestInit);
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            return response.json();
        };      
    })
    .then(json_response => {
        visual.updateOutput(`[${aliveStr}] Succeed to Post Key: ${key}`);
        visual.updateInput(json_response);
        return;
    })
    .catch(e => {
        visual.updateOutput(`There has been a problem with your fetch operation for request path "${requestPath}": ` + e.message);
        return;
    });

    return;
}

// Interface for client viewmodel
interface ClientViewModel {
    queries: string[];
    years: string[];
    months: string[];
    indicators: string[];
};

// Function that converts queried data into a view model that will be used by the visual
function visualTransform(options: VisualUpdateOptions, host: IVisualHost, visualSettings: VisualSettings): ClientViewModel {
    const dataView = options.dataViews;

    const table = dataView[0].table;
    const rows = table.rows;
    const columns = table.columns;

    let queries: string[] = [];
    columns.forEach(column => {
        queries.push(column.queryName);
    });

    let years: string[] = [];
    let months: string[] = [];
    let indicators: string[] = [];
    rows.forEach(row => {
        if (row.length > 0) {
            years.push(row[0].toString());
            if (row.length > 1) {
                months.push(row[1].toString());
                if (row.length > 2) {
                    indicators.push(row[2].toString());
                };
            };
        };        
    });

    return {
        queries: queries,
        years: years,
        months: months,
        indicators: indicators,
    };
};

export class Visual implements IVisual {
    private host: IVisualHost;

    private target: HTMLElement;

    private keyForm: HTMLElement;
    private keySelectYear: HTMLSelectElement;
    private keySelectMonth: HTMLSelectElement;
    private keySelectIndicator: HTMLSelectElement;

    private lastUsedQueries: string[];

    private outputTextNode: Text;

    private inputDiv: HTMLElement;

    private visualSettings: VisualSettings;


    // private options: VisualUpdateOptions;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.lastUsedQueries = [];
        if (document) {           
            const mainDiv: HTMLElement = document.createElement('div');

            // Output Information Text
            const output = document.createElement('p');
            this.outputTextNode = document.createTextNode('...');
            output.setAttribute('id', 'output');
            output.appendChild(this.outputTextNode);

            // Input Area
            const editor = document.createElement('div');
            editor.setAttribute('id', 'editor');

            this.inputDiv = document.createElement('div');
            this.inputDiv.setAttribute('contenteditable', 'true');

            const postInput = document.createElement('button');
            postInput.setAttribute('type', 'button');
            postInput.appendChild(document.createTextNode('Post Input'));
            postInput.addEventListener('click', _ => {
                postKeyToServer(this, this.getKeySelected(), this.inputDiv.innerHTML, 'post');
            });

            const publishInput = document.createElement('button');
            publishInput.setAttribute('type', 'button');
            publishInput.appendChild(document.createTextNode('Publish Input'));
            publishInput.addEventListener('click', _ => {
                postKeyToServer(this, this.getKeySelected(), this.inputDiv.innerHTML, 'publish');
            });

            // const boldButton = document.createElement('button');
            // boldButton.setAttribute('type', 'button');
            // boldButton.appendChild(document.createTextNode('Bold'));
            // boldButton.addEventListener('click', _ => {
            //     this.formatInput('bold');
            // });

            // const italicButton = document.createElement('button');
            // italicButton.setAttribute('type', 'button');
            // italicButton.appendChild(document.createTextNode('Italic'));
            // italicButton.addEventListener('click', _ => {
            //     this.formatInput('italic');
            // });

            // editor.appendChild(boldButton);
            // editor.appendChild(italicButton);
            editor.appendChild(this.inputDiv);
            editor.appendChild(postInput);
            editor.appendChild(publishInput);

            // Key Form
            this.keyForm = document.createElement('div');

            const keyLabelYear = document.createElement('label');
            keyLabelYear.setAttribute('for', 'key-select-year');
            keyLabelYear.appendChild(document.createTextNode('Year: '));

            this.keySelectYear = document.createElement('select');
            this.keySelectYear.setAttribute('name', 'keys');
            this.keySelectYear.setAttribute('id', 'key-select-year');
            
            const keyLabelMonth = document.createElement('label');
            keyLabelMonth.setAttribute('for', 'key-select-month');
            keyLabelMonth.appendChild(document.createTextNode('Month: '));

            this.keySelectMonth = document.createElement('select');
            this.keySelectMonth.setAttribute('name', 'keys');
            this.keySelectMonth.setAttribute('id', 'key-select-month');  

            const keyLabelIndicator= document.createElement('label');
            keyLabelIndicator.setAttribute('for', 'key-select-indicator');
            keyLabelIndicator.appendChild(document.createTextNode('Indicator: '));

            this.keySelectIndicator = document.createElement('select');
            this.keySelectIndicator.setAttribute('name', 'keys');
            this.keySelectIndicator.setAttribute('id', 'key-select-indicator');

            const optionAYear = document.createElement('option');
            optionAYear.setAttribute('value', 'sample-option-A');
            optionAYear.appendChild(document.createTextNode('Option A'));

            const optionBYear = document.createElement('option');
            optionBYear.setAttribute('value', 'sample-option-B');
            optionBYear.appendChild(document.createTextNode('Option B'));

            const optionAMonth = document.createElement('option');
            optionAMonth.setAttribute('value', 'sample-option-A');
            optionAMonth.appendChild(document.createTextNode('Option A'));

            const optionBMonth = document.createElement('option');
            optionBMonth.setAttribute('value', 'sample-option-B');
            optionBMonth.appendChild(document.createTextNode('Option B'));

            const optionAIndicator = document.createElement('option');
            optionAIndicator.setAttribute('value', 'sample-option-A');
            optionAIndicator.appendChild(document.createTextNode('Option A'));

            const optionBIndicator = document.createElement('option');
            optionBIndicator.setAttribute('value', 'sample-option-B');
            optionBIndicator.appendChild(document.createTextNode('Option B'));

            this.keySelectYear.appendChild(optionBYear);
            this.keySelectYear.appendChild(optionBYear);

            this.keySelectMonth.appendChild(optionAMonth);
            this.keySelectMonth.appendChild(optionBMonth);

            this.keySelectIndicator.appendChild(optionAIndicator);
            this.keySelectIndicator.appendChild(optionBIndicator);

            const keySubmit = document.createElement('button');
            keySubmit.setAttribute('type', 'button');
            keySubmit.appendChild(document.createTextNode('Get Key'));
            keySubmit.addEventListener('click', _ => {
                getKeyFromServer(this, this.getKeySelected());            
            });


            this.keyForm.appendChild(keyLabelYear);
            this.keyForm.appendChild(this.keySelectYear);
            this.keyForm.appendChild(keyLabelMonth);
            this.keyForm.appendChild(this.keySelectMonth);
            this.keyForm.appendChild(keyLabelIndicator);
            this.keyForm.appendChild(this.keySelectIndicator);
            this.keyForm.appendChild(keySubmit);
        
            // Append element to the Main DIV then target

            mainDiv.appendChild(this.keyForm);
            mainDiv.appendChild(output);
            mainDiv.appendChild(editor);

            this.target.appendChild(mainDiv);
        };
    };

    public getKeySelected(): string {
        const keyYear: string = this.keySelectYear.value.toString();
        const keyMonth: string = '';//this.keySelectMonth.value.toString();
        const keyIndicator: string = '';//this.keySelectIndicator.value.toString();

        if (keyYear === 'sample-option-A' || keyMonth === 'sample-option-A' || keyIndicator === 'sample-option-A' || keyYear === 'sample-option-B' || keyMonth === 'sample-option-B' || keyIndicator === 'sample-option-B') {
            return '';
        };
        return `${keyYear}-${keyMonth}-${keyIndicator}`;
    };

    public updateOutput(output: string): void {
        this.outputTextNode.textContent = output;
    };

    public updateInput(input: string): void {
        this.inputDiv.innerHTML = input['body'];

         // red (does not exist), orange (does exist), green (published)
        if ( input['status'] === 'new') {
            this.inputDiv.style['border-color']= 'red';
        }
        else if ( input['status'] === 'updated') {
            this.inputDiv.style['border-color']= 'orange';
        }
        else if ( input['status'] === 'published') {
            this.inputDiv.style['border-color']= 'green';
        };
        
    };

    // public formatInput(tag: string) {
    //     const selection: globalThis.Selection = document.getSelection();
    //     const selectionString: string = selection.toString();
    //     const selectionOffsetStart = Math.min(selection.anchorOffset, selection.focusOffset);
    //     const selectionOffsetEnd = Math.max(selection.anchorOffset, selection.focusOffset);
    //     const selectionFocusOffset = selection.focusOffset;
    //     const selectionAnchorOffset = selection.anchorOffset;
    //     const selectionFocusNode = selection.focusNode;
    //     const selectionAnchorNode = selection.anchorNode;

    //     if (selectionFocusNode === selectionAnchorNode) {
    //         this.updateOutput(`Same Selection Node - Range: ${selection.rangeCount}`);

    //         const node = document.createTextNode('?');
    //     };

    //     const focusNode = document.createTextNode('-');
    //     const anchorNode = document.createTextNode('+');
        

    //     selectionFocusNode.parentNode.replaceChild(focusNode, selectionFocusNode);
    //     selectionAnchorNode.parentNode.replaceChild(anchorNode, selectionAnchorNode);
        

    //     return;


    //     if (tag === 'italic') {
    //         this.updateOutput(`[${selectionOffsetStart}-${selectionOffsetEnd}] [${selectionString}] ${selection.focusNode.textContent}`);
    //         return;
    //     };

    //     if (selectionString.length == 0) {
    //         this.updateOutput(`[${selectionOffsetStart}-${selectionOffsetEnd}]`);
    //         return;
    //     };

    //     // const node = document.createElement('div');
    //     //node.appendChild(document.createTextNode(selection.focusNode.textContent.substring(0, selectionOffsetStart)));
    //     // let updatedInnerHTML: string = selection.focusNode.textContent.substring(0, selectionOffsetStart);

    //     const spanTag = document.createElement('span');
    //     spanTag.setAttribute('class', tag);
    //     spanTag.textContent = selectionString;
    //     // updatedInnerHTML += spanTag.outerHTML;
    //     //node.appendChild(spanTag);

    //    // node.appendChild(document.createTextNode(selection.focusNode.textContent.substring(selectionOffsetEnd)));

    //     // updatedInnerHTML += selection.focusNode.textContent.substring(selectionOffsetEnd);

    //     this.updateOutput(`[${selectionOffsetStart}-${selectionOffsetEnd}] ${selectionString}`);

    //     //this.inputDiv.replaceChild(node,  selection.focusNode)

    // };

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: VisualSettings = this.visualSettings || <VisualSettings>VisualSettings.getDefault();
        return VisualSettings.enumerateObjectInstances(settings, options);
    };

    public update(options: VisualUpdateOptions) {
        const viewModel: ClientViewModel = visualTransform(options, this.host, this.visualSettings);
        const isNewQueries = areArraysEquals(this.lastUsedQueries, viewModel.queries);
        
        if (isNewQueries) {
            // Remove old list options
            while (this.keySelectYear.firstChild) {
                this.keySelectYear.removeChild(this.keySelectYear.firstChild);
            };
            // while (this.keySelectMonth.firstChild) {
            //     this.keySelectMonth.removeChild(this.keySelectMonth.firstChild);
            // };
            // while (this.keySelectIndicator.firstChild) {
            //     this.keySelectIndicator.removeChild(this.keySelectIndicator.firstChild);
            // };
                 
            // Actualise list options
            for (let i = 0; i < viewModel.years.length; i++) {
                const keyOption = document.createElement('option');
                keyOption.setAttribute('value', viewModel.years[i]);
                keyOption.appendChild(document.createTextNode(viewModel.years[i]));
                
                this.keySelectYear.appendChild(keyOption);
            };
            // for (let i = 0; i < viewModel.months.length; i++) {
            //     const keyOption = document.createElement('option');
            //     keyOption.setAttribute('value', viewModel.months[i]);
            //     keyOption.appendChild(document.createTextNode(viewModel.months[i]));
                
            //     this.keySelectMonth.appendChild(keyOption);
            // };
            // for (let i = 0; i < viewModel.indicators.length; i++) {
            //     const keyOption = document.createElement('option');
            //     keyOption.setAttribute('value', viewModel.indicators[i]);
            //     keyOption.appendChild(document.createTextNode(viewModel.indicators[i]));
                
            //     this.keySelectIndicator.appendChild(keyOption);
            // };
            // Actualise queries
            this.lastUsedQueries = viewModel.queries;
        };
    };

    // private static parseSettings(dataView: DataView): VisualSettings {
    //     return <VisualSettings>VisualSettings.parse(dataView);
    // }

    // /**
    //  * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
    //  * objects and properties you want to expose to the users in the property pane.
    //  *
    //  */
    // public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
    //     return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    // }
};