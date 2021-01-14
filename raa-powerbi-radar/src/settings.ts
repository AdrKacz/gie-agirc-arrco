/*
 *  Power BI Visualizations
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

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";

export class ColorsSettings {

    
    public colorA: string = "#F6B47C";
    public colorB: string = "#8D007B";
    public colorC: string = "#B2B4B2";
};

export class LabelsSettings {
    public axis: boolean = true;
    public legends: boolean = true;
};

export class AxisSettings {
    public startValue: number = 0;
    public endValue: number = 1;
    public revertDays: boolean = false;
};

export class GraphSettings {
    public strokeWidth: number = 2;
    public globalSizeRatio: number = 0.33;
    public backgroundLevel: number = 5;
    public targetName: string = "Valeurs Cibles";
};

export class FontSettings {
    public sizeLabelData: number = 10;
    public sizeLabelAxis: number = 20;
    public sizeLegend: number = 10;
}

export class VisualSettings extends dataViewObjectsParser.DataViewObjectsParser {
    public colors: ColorsSettings = new ColorsSettings();
    public labels: LabelsSettings = new LabelsSettings();
    public axis: AxisSettings = new AxisSettings();
    public graph: GraphSettings = new GraphSettings();
    public font: FontSettings = new FontSettings();
};

