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
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { VisualSettings } from "./settings";

// Const that store value how useful unicode
const UNIBOX = '&#9744;'; // Not used
const UNIBOXCHECK = '&#10004;'; // &#10004; or &#9745;
const UNIBOXX = '&#9746;'; // Not used

const UNIFOLDERCLOSE = '&#128193;'; // Not used
const UNIFOLDEROPEN = '&#128194;'; // Not used

const UNIDOWNARROW = '&#10549;'; // &#9660; or &#9662; or &#10549;

// Helper function to create timeout promise (useful if server can not be access => remove long waiting time)
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

// Send GET request to the server
function getKeyFromServer(visual: Visual, key: string): void {
    // Warning - ETHERNET and WIFI address change over time ...
    // Need to find a way to solve this ...

    let requestPath: string = '/';
    const requestInit: RequestInit = {
        method: "GET",
    };

    // Find which server is alive then send it the request

    let local: Promise<void | Response> = timeoutPromise(1000, fetch('http://127.0.0.1:5000/'))
        .catch(e => {
            // Inform the user that the local cannot be reached
        });
    
    // Same for ETHERNET (172.29.134.132) and WIFI (172.29.146.134) 

    let alive: string = "";
    let aliveStr: string = "";

    Promise.all([local]).then(responses => {
        const resLocal = responses[0];
        
    })
};

// Helper function to add zero to the left of a number to print
function leftPad(num, targetLength) {
    return num.toString().padStart(targetLength, 0);
}

// Interface for comment
interface CommentViewModel {
    commentKey : string;
    commentValue : string;
    errorMessage: string;
    validData: boolean;
};

function visualTransform(options: VisualUpdateOptions, host: IVisualHost, visualSettings: VisualSettings): CommentViewModel {
    const dataView = options.dataViews;

    const categorical = options.dataViews[0].categorical;
    
    let commentView: CommentViewModel = {
        commentKey : '',
        commentValue : '',
        errorMessage: '',
        validData: true,
    };

    if (categorical) { 
        const values = categorical.values;

        // Check if the data are correct
        // Is enought data ? (at least 2)
        if (values.length < 2) {
            commentView.validData = false;
            commentView.errorMessage = 'Not enought input';
            return commentView;
        };

        // Are they in the right order (key then measure ==> should always be right)
        if (!values[0].source.roles.key || !values[1].source.roles.value) {
            commentView.validData = false;
            commentView.errorMessage = 'Input not correctly set';
            return commentView;
        };

        // Measures did not return result
        if (values[0].values.length < 1 || values[1].values.length < 1) {
            commentView.validData = false;
            commentView.errorMessage = 'No data to read from at least one of the input measure';
            return commentView;
        };

        // No problem > Assign values and return
        commentView.commentKey = values[0].values[0].toString()
        commentView.commentValue = values[1].values[0].toString()   
        return commentView;
    };

    // Problem with none categorical data
    commentView.validData = false;
    commentView.errorMessage = 'Data not correctly handle (none categorical)';
    return commentView;
};

export class Visual implements IVisual {
    private host: IVisualHost;
    private visualSettings: VisualSettings;

    private target: HTMLElement;

    private outputTextNode: Text;
    private inputDiv: HTMLElement;
    private exportLink: HTMLElement;

    private validateBtn: HTMLElement;

    private outputP: HTMLElement;
    private validateDiv: HTMLElement;
    private exportLinkDiv: HTMLElement;

    private currentKey: string;
    private currentValue: string;

    // private updateCount: number;
    private numberValidation: number;

    private validatedInputs: {};
    
    constructor(options: VisualConstructorOptions) {
        this.currentKey = "";
        this.currentValue = "";
        // this.updateCount = 0;
        this.numberValidation = 0;

        this.validatedInputs = {};

        this.target = options.element;

        if (document) {
            // Create main
            const main = document.createElement('div');

            // Create output node
            this.outputP = document.createElement('p');
            this.outputTextNode = document.createTextNode('...');
            this.outputP.setAttribute('id', 'output');
            this.outputP.appendChild(this.outputTextNode);
            

            // Create input node
            const editor = document.createElement('div');
            editor.setAttribute('id', 'editor');

            this.inputDiv = document.createElement('div');
            this.inputDiv.setAttribute('id', 'editor-input');
            this.inputDiv.setAttribute('contenteditable', 'true');
            this.inputDiv.addEventListener('input', _ => {
                this.inputChanged();
            });

            editor.appendChild(this.inputDiv);

            // Validate change button
            this.validateDiv = document.createElement('div');
            this.validateDiv.setAttribute('class', 'check');

            this.validateBtn = document.createElement('button');      
            this.validateBtn.setAttribute('type', 'button');
            this.validateBtn.innerHTML = UNIBOXCHECK;
            this.validateBtn.addEventListener('click', _ => {
                this.validateInput();
            });
            this.validateBtn.style.setProperty('color', 'black'); // Fix color mode (no changement)

            this.validateDiv.appendChild(this.validateBtn);

            // Export data button
            this.exportLinkDiv = document.createElement('div');
            this.exportLinkDiv.setAttribute('class', 'export');

            this.exportLink = document.createElement('a');           
            this.exportLink.setAttribute('href', '#');
            this.exportLink.setAttribute('download', 'empty.json');
            this.exportLink.innerHTML = UNIDOWNARROW;

            this.exportLinkDiv.appendChild(this.exportLink);

            // Append element to target
            main.appendChild(editor);
            main.appendChild(this.validateDiv);
            main.appendChild(this.exportLinkDiv);
            
            main.appendChild(this.outputP);

            this.target.appendChild(main);
        };
    };

    public update(options: VisualUpdateOptions) {
        // Get Settings
        const oldVisualSettings = this.visualSettings;
        this.visualSettings = VisualSettings.parse<VisualSettings>(options.dataViews[0]);

        // Check if edit mode change
        if (this.visualSettings.edition.isActive !== oldVisualSettings.edition.isActive) {
            if (!this.visualSettings.edition.isActive) {
                // If no edition, hide button, link and output, stop content editable
                this.outputP.setAttribute('class', 'hidden');
                this.validateDiv.setAttribute('class', 'check hidden');
                this.exportLinkDiv.setAttribute('class', 'export hidden');

                this.inputDiv.setAttribute('contenteditable', 'false');

                // Set background to transparent
                this.inputDiv.parentElement.style.setProperty('background-color', 'transparent');
            } else {
                // If edition, show button, link and output, start content editable
                this.outputP.setAttribute('class', '');
                this.validateDiv.setAttribute('class', 'check');
                this.exportLinkDiv.setAttribute('class', 'export');

                this.inputDiv.setAttribute('contenteditable', 'true');

                // Set background to original color
                this.inputDiv.parentElement.style.setProperty('background-color', '');
            }
        };

        // Update the font size
        this.inputDiv.style.fontSize = `${this.visualSettings.edition.fontSize}px`;

        // Get Data
        const viewModel: CommentViewModel = visualTransform(options, this.host, this.visualSettings);

        // Check if the inputs are valid and quit if not
        if (!viewModel.validData) {
            this.currentKey = '';
            this.currentValue = '';
            this.displayOutput(`[Error] ${viewModel.errorMessage}`);
            return;
        };

        

        let isNewValues: boolean =  false;
        // Check if the values are new and quit if not (minimum update verification)
        if (this.currentKey !== viewModel.commentKey) {
            isNewValues = true;
        };

        if (this.currentValue !== viewModel.commentValue) {
            isNewValues = true;
        };

        if (!isNewValues) {
            return;
        };

        // Update
        this.currentKey = viewModel.commentKey;
        this.currentValue = viewModel.commentValue;

        // Check length
        if (this.currentKey === '' && this.currentValue === '') {
            // Handle empty case and quit
            this.displayOutput(`[ERROR] Nothing selected`);
            return;
        };

        // Update the visual according the its new value.
        this.displayOutput(`[SELECTED] KEY: ${this.currentKey} - VALUE: ${this.currentValue}`);

        if (this.validatedInputs[this.currentKey]) {
            this.displayHTMLInput(this.validatedInputs[this.currentKey].htmlValue);
        } else {
            this.displayHTMLInput(this.currentValue);
        };

    };

    private inputChanged() {
        this.validateBtn.style.setProperty('color', ''); // Switch color mode
    };

    private displayOutput(textToDisplay: string) {
        this.outputTextNode.textContent = textToDisplay;
    };

    private displayHTMLInput(htmlToDisplay: string) {
        this.inputDiv.innerHTML = htmlToDisplay;
    }

    private validateInput() {
        if (this.currentKey.length > 0) {
            // Id format
            // yyyy-mm-dd-hh-mm-ss-milli-random_number_between_0_and_9999
            // remove '-', date at UTC
            const nowDate = Date.now();

            const randomStr = leftPad(Math.floor(Math.random() * 10000) % 100, 2); // Hypothesis: no more than 100 modifications during one timestamps (1milliseconds)

            const nowBasis = `${nowDate}`;

            const nowID = `${nowBasis}${randomStr}`;

            this.validatedInputs[this.currentKey] =  {
                key: this.currentKey,
                htmlValue: this.inputDiv.innerHTML,
                id: parseInt(nowID),
                date: nowDate,
            };

            this.numberValidation += 1;
            this.validateBtn.style.setProperty('color', 'black'); // Fix color mode (no changement)

            this.displayOutput(`[SAVED] KEY: ${this.validatedInputs[this.currentKey].key} - ID: ${this.validatedInputs[this.currentKey].id}`);

            this.updateExportLink(nowBasis);
        } else {
            this.displayOutput('[Error] No key to assign');
        };
    };

    private updateExportLink(lastBasisComputed) {
        // check if the validated input are not empty, else quit
        if (this.numberValidation === 0) {
            return;
        };
        const preHREF = 'data:text/csv;charset=utf-8,%EF%BB%BF';
        const csvString = this.getValidatedInputsToCSV();
        const href = preHREF + csvString;//+ encodeURIComponent(JSON.stringify(this.validatedInputs));

        this.exportLink.setAttribute('href', href);

        // Link Name for download > Could then be used to determine which update is the last one during merge
        const numberValidationStr = leftPad(this.numberValidation % 100, 2); // Hypothesis: no more than 100 modification during one seconds (min base of ID)

        const nowDownload = `${lastBasisComputed}-${numberValidationStr}`;

        this.exportLink.setAttribute('download', `${nowDownload}.csv`);
    };

    private getValidatedInputsToCSV() {
        let csvString = 'ID,Date,Key,HTMLValue\r\n';

        for (let key in this.validatedInputs) {
            csvString += `${this.validatedInputs[key].id},${this.validatedInputs[key].date},${this.validatedInputs[key].key},${this.validatedInputs[key].htmlValue}`;
            csvString += '\r\n';
        };

        return csvString;
    };

    // private static parseSettings(dataView: DataView): VisualSettings {
    //     return <VisualSettings>VisualSettings.parse(dataView);
    // }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.visualSettings || VisualSettings.getDefault(), options);
    }
}