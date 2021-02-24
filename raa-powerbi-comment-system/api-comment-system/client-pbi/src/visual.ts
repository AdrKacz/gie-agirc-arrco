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
function timeoutPromise(ms:number, promise:Promise<Response>): Promise<void | Response> {
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
function getFromServer(visual: Visual, commentView: CommentViewModel): void {
    // Better if the first argument IS the output method and not the visual
    // Avoid bug if the name of the method change
    
    const requestPath: string = "https://celul.ovh/JSONServe/get.php";
    const requestParams: string = encodeURI(`?k=${commentView.commentKey}`);

    const requestInit: RequestInit = {
        method: 'GET',
    };

    // returned type Promise<void | Response>
    timeoutPromise(1000, fetch(requestPath + requestParams, requestInit))
        .then(response => {
            if (!response) {
                throw new Error(`[Error] Do not succeed to reach the server`);
            } else if (!response.ok) {
                throw new Error(`[Error] HTTP status: ${response.status}`);
            } else {
                return response.json();
            };   
        })
        .then(jsonResponse => {
            visual.updateCommentViewWithJSON(jsonResponse);
        })
        .catch(e => {
            visual.displayOutput(`[Error] Fetch at ${requestPath + requestParams} returned <${e.message}>`);
        });

    return;
};

function postToServer(visual: Visual, commentView: CommentViewModel): void {
    // Better if the first argument IS the output method and not the visual
    // Avoid bug if the name of the method change

    const requestPath: string = "https://celul.ovh/JSONServe/set.php";
    const requestParams: string = encodeURI(`?k=${commentView.commentKey}&c=${commentView.commentValue}`);

    const requestInit: RequestInit = {
        method: 'POST',
    };

    // returned type Promise<void | Response>
    timeoutPromise(1000, fetch(requestPath + requestParams, requestInit))
        .then(response => {
            if (!response) {
                throw new Error(`[Error] Do not succeed to reach the server`);
            } else if (!response.ok) {
                throw new Error(`[Error] HTTP status: ${response.status}`);
            } else {
                return response.json();
            };   
        })
        .then(_ => {
            visual.displayOutput(`[Debug] Reach Server`);
        })
        .catch(e => {
            visual.displayOutput(`[Error] Fetch at ${requestPath} returned <${e.message}>`);
        });

    return;
}

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
    isLoading: boolean;
};

function visualTransform(options: VisualUpdateOptions, host: IVisualHost, visualSettings: VisualSettings): CommentViewModel {
    let commentView: CommentViewModel = {
        commentKey : '',
        commentValue : '',
        errorMessage: '',
        validData: false,
        isLoading: false,
    };

    // Problem with input measure (most of the case when there is no measure)
    if (!options || !options.dataViews || !options.dataViews[0]) {
        commentView.errorMessage = 'No measure';
        return commentView;
    }

    const single = options.dataViews[0].single;
    if (single) { 
        const value = single.value.toString();

        // Measures did not return result
        if (value.length < 1) {
            commentView.errorMessage = 'No measure value';
            return commentView;
        };

        // No problem > Assign values and return
        commentView.validData = true;
        commentView.commentKey = value; 
        return commentView;
    } else {
        // Problem with none single data
        commentView.errorMessage = 'Data not correctly handle (not single)';
    }; 
    return commentView;
};

export class Visual implements IVisual {
    private host: IVisualHost;
    private visualSettings: VisualSettings;

    private target: HTMLElement;

    private inputDiv: HTMLElement;

    private validateBtn: HTMLElement;

    private outputTextNode: Text;
    private outputP: HTMLElement;
    private validateDiv: HTMLElement;

    private commentView: CommentViewModel;
   
    constructor(options: VisualConstructorOptions) {
        this.commentView = this.getDefaultCommentView();

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
            // Check when the input text is changed (??? user or new key ???)
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
                this.postInput();
            });
            this.validateBtn.style.setProperty('color', 'black'); // Fix color mode (no changement)

            this.validateDiv.appendChild(this.validateBtn);

            // Append element to target
            main.appendChild(editor);
            main.appendChild(this.validateDiv);
            
            main.appendChild(this.outputP);

            this.target.appendChild(main);

            this.displayOutput('[Debug] End Construction');
        };
    };

    public update(options: VisualUpdateOptions) {
        // Update will fire when 
        //      A measure is removed
        //      An existing measure changed
        //      A setting is changed
        //      The visual is resized
        // Update will NOT fire when (WARNING)
        //      A measure is removed
        //      No measure (thus the last correct one remains)
        
        // Get Settings (store past edition value to execute only when needed)
        let pastEditionActiveStatus: boolean = null;
        if (this.visualSettings) {
            pastEditionActiveStatus = this.visualSettings.edition.isActive;  
        };   
        this.visualSettings = VisualSettings.parse<VisualSettings>(options.dataViews[0]);
        
        // Check if edit mode change (to style accordingly) (settings)
        if (this.visualSettings.edition.isActive !== pastEditionActiveStatus) {
            if (!this.visualSettings.edition.isActive) {
                // If no edition, hide button and output, stop content editable
                this.outputP.setAttribute('class', 'hidden');
                this.validateDiv.setAttribute('class', 'check hidden');

                this.inputDiv.setAttribute('contenteditable', 'false');

                // Set background to transparent
                this.inputDiv.parentElement.style.setProperty('background-color', 'transparent');
            } else {
                // If edition, show button and output, start content editable
                this.outputP.setAttribute('class', '');
                this.validateDiv.setAttribute('class', 'check');

                this.inputDiv.setAttribute('contenteditable', 'true');

                // Set background to original color
                this.inputDiv.parentElement.style.setProperty('background-color', '');
            }
        };
        
        // Update the font size (settings)
        this.inputDiv.style.fontSize = `${this.visualSettings.edition.fontSize}px`;

        // Get Input Data (the Key if any), store old one if any (for comparaison with the new one)
        let pastCommentView: CommentViewModel = this.getDefaultCommentView();
        if (this.commentView) {
            pastCommentView = this.commentView;
        };

        this.commentView = visualTransform(options, this.host, this.visualSettings);

        // Check if the inputs are valid and quit if not
        // If the key is empty the data are not valid, no need to check it later on
        if (!this.commentView.validData) {
            this.displayOutput(`[Error] ${this.commentView.errorMessage}`);
            return;
        };

        // Check if the key is a new one (minimum update verification)
        if (this.commentView.commentKey !== pastCommentView.commentKey) {
            // Update Input Div
            this.displayHTMLInput(this.commentView.commentValue); // Empty string at this stage

            // Update Output Div
            this.displayOutput(`[Debug] Key Selected: ${this.commentView.commentKey}`);

            // Fetch the server for the comment value
            getFromServer(this, this.commentView);
        };

    };

    public updateCommentViewWithJSON(updatedCommentViewJSON) {
        this.displayOutput(`[Debug] Parse and Update the input field, JSON received: "${updatedCommentViewJSON.c}"`);

        // Parse the JSON input
        const updateCommentView: CommentViewModel = this.getDefaultCommentView();
        updateCommentView.commentKey = updatedCommentViewJSON.k;
        updateCommentView.commentValue = updatedCommentViewJSON.c;

        // Update if the key match (they should match if the code flow is respected)
        if (updateCommentView.commentKey === this.commentView.commentKey) {
            updateCommentView.validData = true;

            this.commentView = updateCommentView;
        };

        // Update the Input Div
        this.displayHTMLInput(this.commentView.commentValue);
    };

    public displayOutput(textToDisplay: string) {
        this.outputTextNode.textContent = textToDisplay;
    };

    private getDefaultCommentView(): CommentViewModel {
        return {
            commentKey : "",
            commentValue : "",
            errorMessage: "",
            validData: false,
            isLoading: false,
        };
    };

    private inputChanged() {
        this.validateBtn.style.setProperty('color', ''); // Switch color mode
        // Store input if key registered
        if (this.commentView.validData) {
            this.commentView.commentValue = this.inputDiv.innerHTML;
        };
    };

    

    private displayHTMLInput(htmlToDisplay: string) {
        // No verification performs on the text input
        this.inputDiv.innerHTML = htmlToDisplay;
    }

    private postInput() {
        // commentView is stored only if it is valid
        if (this.commentView.validData) {
            this.displayOutput(`[Debug] Call Fetch to post the key ${this.commentView.commentKey}`);

            // POST the commentValue linked to the commentKey to the server
            postToServer(this, this.commentView);

            // Id format
            // yyyy-mm-dd-hh-mm-ss-milli-random_number_between_0_and_9999
            // remove '-', date at UTC

            // const nowDate = Date.now();
            // const nowBasis = `${nowDate}`;
            // Hypothesis: no more than 100 modifications during one timestamps (1milliseconds)
            // const randomStr = leftPad(Math.floor(Math.random() * 10000) % 100, 2);      
            // const nowID = `${nowBasis}${randomStr}`;
            // this.validatedInputs[this.currentKey] =  {
            //     key: this.currentKey,
            //     htmlValue: this.inputDiv.innerHTML,
            //     id: parseInt(nowID),
            //     date: nowDate,
            // };
            // this.numberValidation += 1;

            // this.validateBtn.style.setProperty('color', 'black'); // Fix color mode (no changement)
            // this.displayOutput(`[SAVED] KEY: ${this.validatedInputs[this.currentKey].key} - ID: ${this.validatedInputs[this.currentKey].id}`);
        } else {
            this.displayOutput('[Error] No key to post');
        };
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