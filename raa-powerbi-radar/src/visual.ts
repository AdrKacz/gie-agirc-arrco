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
*
*/

"use strict";
 
import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;


import IVisualHost = powerbi.extensibility.visual.IVisualHost;


import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

// Settings Handling
import { VisualSettings } from "./settings"
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;

// Interface for Radars viewmodel
interface RadarViewModel {
    dataPoints: RadarDataPoint[];
    categories: Category[];
    sources: Source[];
    labels: boolean[];
};

// Interface for Radar data points
interface RadarDataPoint {
    value: number;
    strValue: string;
    source: Source;
    category: Category;
    rank: number;
};

// Interface for Categories
interface Category {
    startValue: number;
    endValue: number;
    index: number;
    name: string;
    min: number;
    max: number;
    dataPoints: RadarDataPoint[];
    isDay: boolean;
}

// Interface for Sources
interface Source {
    sourceName: string;
    lineStyle: LineStyle;
    index: number;
};

// Interface for line style
interface LineStyle {
    color: string;
    stroke: string;
    style: string;
};

// Function that converts queried data into a view model that will be used by the visual
function visualTransform(options: VisualUpdateOptions, host: IVisualHost, visualSettings: VisualSettings): RadarViewModel {
    // Convert dataView to your viewModel
    let dataViews = options.dataViews;
    let radarDataPoints: RadarDataPoint[] = [];

    let categorical = dataViews[0].categorical;
    let categoriesValues = categorical.categories[0].values;
    let dataValues = categorical.values;

    // Assign Categories
    let categories : Category[] = [];
    let index : number = 0;
    categoriesValues.forEach(categoryValue => {
        categories.push({
            startValue: visualSettings.axis.startValue,
            endValue: visualSettings.axis.endValue,
            index: index,
            name: categoryValue.toString(),
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY,
            dataPoints: [],
            isDay: false,
        });
        index += 1;
    });

    // Variable to kep track of a particular value (act differently than other)
    let dayTarget = 1; // Re assign with its correct value later on

    // Assign Values
    let sources : Source[] = [];
    for (let i = 0; i < dataValues.length; i++) {

        let color: string;
        let style: string;
        // Agirc-Arrco Colors
        // #F6B47C -> Orange
        // #8D007B -> Purple
        // #B2B4B2 -> Gray
        switch (i) {
            case 0: {
                color = visualSettings.colors.colorA;
                style = '1 0'; // Line
                break;
            };
            case 1: {
                color = visualSettings.colors.colorB;
                style = '1 0'; // Line
                break;
            };
            default: {
                color = visualSettings.colors.colorC;
                style = "4 4"; // Dash Line, 4 filled 4 empty
                break;
            };
        };

        sources.push({
            sourceName: dataValues[i].source.displayName,
            lineStyle: {
                color: color,
                stroke: "white",
                style: style,
            },
            index: i,
        });

        for (let j = 0; j < dataValues[i].values.length; j++) {

            // Handle day format
            let value: number = parseFloat(dataValues[i].values[j].toString());         
            let strValueNet: string = value.toFixed(1);
            const strAppend: string = value > 1 ? " jours" : " %";

            if (value <= 1) { // Rewrite percentage as XX.X ("%" is stored in strAppend)
                strValueNet = (100 * value).toFixed(1);
            };

            // Check if its a day and if it is the source related to the target (categories[j] then applies to all the sources)
            if (value > 1 && visualSettings.graph.targetName === sources[sources.length - 1].sourceName) {
                dayTarget = value; // store the target for later on   
                categories[j].isDay = true;
            };
            
            const dataPoint: RadarDataPoint = {
                value: value,
                strValue: strValueNet + strAppend,
                source: sources[sources.length - 1],
                category: categories[j],
                rank: 0,
            }

            // Update min and max of each category
            // Update min
            if (value < categories[j].min) {
                categories[j].min = value;
            };
            // Update max
            if (value > categories[j].max) {
                categories[j].max = value;
            };

            categories[j].dataPoints.push(dataPoint);
        };
    };

    // Sort categories values
    for (let j = 0; j < categories.length; j++) {
        // If is day, assign the larger value to the outer graph
        if (categories[j].isDay) {
            // Start Value still at 0
            categories[j].endValue = categories[j].max;

            // Sort descending
            categories[j].dataPoints.sort(function(a, b) {return b.value - a.value;});         
        }      
        else {
            // Sort ascending
            categories[j].dataPoints.sort(function(a, b) {return a.value - b.value;});     
        };

        // Loop throught data point to update their rank
        for (let i = 0; i < categories[j].dataPoints.length; i++) {
            categories[j].dataPoints[i].rank = i;
        };

        if (categories[j].isDay && visualSettings.axis.revertDays) {
            // categories[j].startValue

            // Update min and max (2 * max - max = max -> simple switch)
            const cachedMax = categories[j].max;
            categories[j].max = 2 * cachedMax - categories[j].min;
            categories[j].min = cachedMax;

            categories[j].endValue = categories[j].max;
            // Loop throught data point to update their rank and value
            for (let i = 0; i < categories[j].dataPoints.length; i++) {
                categories[j].dataPoints[i].value = 2 * cachedMax - categories[j].dataPoints[i].value;
            };
        };
        
        // Push the data point to the global list radarDataPoints
        for (let i = 0; i < categories[j].dataPoints.length; i++) {
            radarDataPoints.push(categories[j].dataPoints[i]);
        };
    };

    // Sort radarDataPoints by Source (currently sort by Categories), need to sort by source to plot correctly
    radarDataPoints.sort(function(a, b) {return a.source.index - b.source.index;});

    let radarViewModel: RadarViewModel = {
        dataPoints: radarDataPoints,
        categories: categories,
        sources: sources,
        labels: [
            visualSettings.labels.axis,
            visualSettings.labels.legends,
        ],
    };

    return radarViewModel;
};

// Text Placement function
function textValueCoordinates(angle: number, sourceIndex: number, axis: string, fontSize: number, nbOfChar: number, growthFactor: number = 1) {
    const sinAngle : number = Math.sin(angle);
    const cosAngle : number = Math.cos(angle);

    // Check in which part of the graph we are (side or upper/bottom)
    // Upper/Bottom
    if (Math.abs(sinAngle) < Math.abs(cosAngle)) {
        // Horizontal placement
        if (axis === 'y') {
            let base = 0;
            if (Math.sign(cosAngle) > 0) {
                base = 4.5;
            };
            return (base + (-1 - sourceIndex)) * fontSize * 1.4 * growthFactor; // 20
            // return (-1 + sourceIndex) * fontSize * nbOfChar * 0.6 * growthFactor; // 60
        };
        // Vertical placement
        // growthFactor = growthFactor > 1 ? growthFactor / 2 : growthFactor; // Not need to go far in vertical axis
        // return Math.sign(cosAngle) * 20 * growthFactor;
        return 0;
    }
    // Sides
    else {
        // Vertical placement
        if (axis === 'y') {
            return (1 - sourceIndex) * fontSize * 1.4 * growthFactor; // 20
        };
        // Horizontal placement
        return Math.sign(sinAngle) * 30 * growthFactor;
    };
};


// Polygon Class
class Polygon {
    private centerX: number;
    private centerY: number;
    private radius: number;
    private nbOfSides: number;

    constructor(centerX: number, centerY: number, radius: number, nbOfSides: number) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        this.nbOfSides = nbOfSides;
    };

    get lines() {
        let points = [];

        for (let index = 0; index < this.nbOfSides; index++) {
            let point = {
                'x': this.centerX + Math.cos(Math.PI / 2 + Math.PI * 2 * index / this.nbOfSides) * this.radius,
                'y': this.centerY + Math.sin(Math.PI / 2 + Math.PI * 2 * index / this.nbOfSides) * this.radius,
            };
            points.push(point);
        };

        let lines = d3.range(points.length).map(i => ({
            x1: points[i].x,
            y1: points[i].y,
            x2: points[(i + 1) % points.length].x,
            y2: points[(i + 1) % points.length].y,
        }));
        return lines;
    };
};

// Polygons Background Class
class PolygonsBackground {
    private polygons: Polygon[]

    constructor(centerX: number, centerY: number, radius: number, nbOfSides: number, nbOfPolygons: number) {
        this.polygons = []
        for (let i = 0; i < nbOfPolygons; i++) {
            this.polygons.push(new Polygon(centerX, centerY, radius * (i + 1) / nbOfPolygons, nbOfSides));         
        };
    };

    get lines() {
        let lines: {x1: number, y1: number, x2: number, y2: number}[] = [];

        this.polygons.forEach(p => {
            lines = lines.concat(p.lines);
        });

        return lines
    };
};

export class Visual implements IVisual {
    private host: IVisualHost;
    private svg: Selection<SVGElement>;
    private graphBackgroundContainer: Selection<SVGElement>;
    private graphDatacontainer: Selection<SVGElement>;
    private graphLegendContainer: Selection<SVGElement>;

    private radarDataPoints: RadarDataPoint[];
    private nbOfCategories: number;

    private visualSettings: VisualSettings;

    constructor(options: VisualConstructorOptions) {
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('radar', true); 

        this.graphBackgroundContainer = this.svg.append('g')
            .classed('backgroundContainer', true); 
            
        this.graphDatacontainer = this.svg.append('g')
            .classed('dataContainer', true);

        this.graphLegendContainer = this.svg.append('g')
            .classed('legendContainer', true);

    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: VisualSettings = this.visualSettings || <VisualSettings>VisualSettings.getDefault();
        return VisualSettings.enumerateObjectInstances(settings, options);
    }

    public update(options: VisualUpdateOptions) {
        // --------------------
        // ----------
        // Initialisation
        // ----------
        // --------------------

        // ----------
        // Get Dimensions and update dimensions and center
        // ----------
        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        this.svg
            .attr('width', width)
            .attr('height', height);

        let centerX: number = width / 2;
        let centerY: number = height / 2;

        // ----------
        // Get Settings and format them if needed and update radius
        // ----------
        this.visualSettings = VisualSettings.parse<VisualSettings>(options.dataViews[0]);
        let radius: number = Math.min(width, height) * this.visualSettings.graph.globalSizeRatio;

        // strokeWidth >= 0
        this.visualSettings.graph.strokeWidth = Math.max(0, this.visualSettings.graph.strokeWidth);
        // 0 <= globalSizeRatio <= 1
        this.visualSettings.graph.globalSizeRatio = Math.max(0, this.visualSettings.graph.globalSizeRatio);
        this.visualSettings.graph.globalSizeRatio = Math.min(1, this.visualSettings.graph.globalSizeRatio);

        // ----------
        // Update Datas - Dynamic Datas -     
        // ----------  
        let viewModel: RadarViewModel = visualTransform(options, this.host, this.visualSettings);
        this.radarDataPoints = viewModel.dataPoints;
        this.nbOfCategories = viewModel.categories.length;

        
        // --------------------
        // ----------
        // Background Polygons Graph
        // ----------
        // --------------------

        // Get polygons backgrounds
        let polygonsBackground = new PolygonsBackground(centerX, centerY, radius, this.nbOfCategories, this.visualSettings.graph.backgroundLevel);

        // Delete and re-create polygons if needed
        if (this.graphBackgroundContainer.selectAll('line').size() !== this.nbOfCategories * this.visualSettings.graph.backgroundLevel) {
            this.graphBackgroundContainer.selectAll('*').remove();

            this.graphBackgroundContainer.selectAll('line')
            .data(polygonsBackground.lines)
            .enter()
            .append('line');
        };
        
        // Map polygon with data
        this.graphBackgroundContainer.selectAll('line')
            .data(polygonsBackground.lines)
            .attr('x1', d => d.x1)
            .attr('y1', d => d.y1)
            .attr('x2', d => d.x2)
            .attr('y2', d => d.y2)
            .attr('stroke', '#C5C5C5')
            .attr('stroke-width', 2);

        // --------------------
        // ----------
        // Datas Lines, Dots and Labels
        // ----------
        // -------------------- 

        // Calculate Points and Lines
        let dataCoordinates = [];
        for (let i = 0; i < this.radarDataPoints.length; i++) {
            const startValue = this.radarDataPoints[i].category.startValue;
            const endValue = this.radarDataPoints[i].category.endValue;

            const valueTransform: number = Math.max(0, (this.radarDataPoints[i].value - startValue) / (endValue - startValue));
            const maxValueTransform: number = Math.max(0, (this.radarDataPoints[i].category.max - startValue) / (endValue - startValue));
            dataCoordinates.push({
                lineStyle: this.radarDataPoints[i].source.lineStyle,
                strValue:  this.radarDataPoints[i].strValue,

                angle: this.radarDataPoints[i].category.index / this.nbOfCategories * Math.PI * 2 + Math.PI,
                rank: this.radarDataPoints[i].rank,

                x: (Math.sin(this.radarDataPoints[i].category.index / this.nbOfCategories * Math.PI * 2 + Math.PI)) * radius * valueTransform + centerX,
                y: (Math.cos(this.radarDataPoints[i].category.index / this.nbOfCategories * Math.PI * 2 + Math.PI)) * radius * valueTransform + centerY,

                xMax: (Math.sin(this.radarDataPoints[i].category.index / this.nbOfCategories * Math.PI * 2 + Math.PI)) * radius * maxValueTransform + centerX,
                yMax: (Math.cos(this.radarDataPoints[i].category.index / this.nbOfCategories * Math.PI * 2 + Math.PI)) * radius * maxValueTransform + centerY,
            });     
        };
        
        // Map lines position
        let dataLines = d3.range(dataCoordinates.length).map(i => ({
                lineStyle:  dataCoordinates[i].lineStyle,
                strValue:  this.radarDataPoints[i].strValue,

                xMax: dataCoordinates[i].xMax,
                yMax: dataCoordinates[i].yMax,

                x1: dataCoordinates[i].x,
                y1: dataCoordinates[i].y,
                x2: dataCoordinates[(i + 1) % this.nbOfCategories + this.nbOfCategories * Math.floor(i / this.nbOfCategories)].x,
                y2: dataCoordinates[(i + 1) % this.nbOfCategories + this.nbOfCategories * Math.floor(i / this.nbOfCategories)].y,     
                
                angle: dataCoordinates[i].angle,
                rank: dataCoordinates[i].rank,
        }));

        // Calculate axis label position
        let dataAxis = [];
        if (viewModel.labels[0]) {
            dataAxis = d3.range(viewModel.categories.length).map(i => ({
                x: (Math.sin(i / viewModel.categories.length * Math.PI * 2 + Math.PI) * radius) + centerX + textValueCoordinates(i / viewModel.categories.length * Math.PI * 2 + Math.PI, 1, 'x', this.visualSettings.font.sizeLabelAxis, viewModel.categories[i].name.length, (i % 3) == 0 ? 1 : 3),
                y: (Math.cos(i / viewModel.categories.length * Math.PI * 2 + Math.PI) * radius) + centerY + textValueCoordinates(i / viewModel.categories.length * Math.PI * 2 + Math.PI, 1, 'y', this.visualSettings.font.sizeLabelAxis, viewModel.categories[i].name.length, (i % 3) == 0 ? 1 : 3),
                text: viewModel.categories[i].name,
            }));
        }

        // Delete and re-create if needed
        if (this.graphDatacontainer.selectAll('circle').size() !== viewModel.categories.length * viewModel.sources.length) {
            this.graphDatacontainer.selectAll('*').remove();

            // Enter lines
            this.graphDatacontainer.selectAll('line')
                .data(dataLines)
                .enter()
                .append('line')

            // Enter dots
            this.graphDatacontainer.selectAll('circle')
                .data(dataLines)
                .enter()
                .append('circle')

            // Enter label data
            this.graphDatacontainer.selectAll('text')
                .data(dataLines)
                .enter()
                .append('text')
        };

        if (this.graphDatacontainer.selectAll('text.axis').size() !== viewModel.categories.length) {
            this.graphDatacontainer.selectAll('text.axis').remove();

            // Enter label axis
            this.graphDatacontainer.selectAll('text.axis')
                .data(dataAxis)
                .enter()
                .append('text')
                    .attr('class', 'axis')
        };

        // Update lines
        this.graphDatacontainer.selectAll('line')
            .data(dataLines)
            .attr('x1', d => d.x1)
            .attr('y1', d => d.y1)
            .attr('x2', d => d.x2)
            .attr('y2', d => d.y2)
            .attr('stroke', d => d.lineStyle.color)
            .attr('stroke-width', this.visualSettings.graph.strokeWidth)
            .style('stroke-dasharray', d => d.lineStyle.style);

        // Update dots
        this.graphDatacontainer.selectAll('circle')
            .data(dataLines)
            .attr('r', 4)
            .attr('cx', d => d.x1)
            .attr('cy', d => d.y1)
            .style('stroke', d => d.lineStyle.stroke)
            .style('stroke-width', 2)
            .style('fill', d => d.lineStyle.color);

        // Update label data
        this.graphDatacontainer.selectAll('text')
            .data(dataLines)
            .attr('text-anchor', 'middle')
            .attr('x', d => d.xMax + textValueCoordinates(d.angle, d.rank, 'x', this.visualSettings.font.sizeLabelData, d.strValue.length))
            .attr('y', d => d.yMax + textValueCoordinates(d.angle, d.rank, 'y', this.visualSettings.font.sizeLabelData, d.strValue.length))
            .style('font-size', '' + this.visualSettings.font.sizeLabelData + 'px')
            .style('fill', d => d.lineStyle.color)
            .style('font-weight', 'bold')
            .text(d => d.strValue);

        // Update label axis
        if (viewModel.labels[0]) {
            this.graphDatacontainer.selectAll('text.axis')
                .data(dataAxis)
                    .attr('text-anchor', 'middle')
                    .attr('class', 'axis')
                    .attr('x', d => d.x)
                    .attr('y', d => d.y)
                    .style('font-size', '' + this.visualSettings.font.sizeLabelAxis + 'px')
                    .text(d => d.text);
        }
        else {
            this.graphDatacontainer.selectAll('text.axis').remove();
        };

        
        // --------------------
        // ----------
        // Legend Lines, Dots and Texts
        // ----------
        // -------------------- 
        if (this.graphLegendContainer.selectAll('text').size() !== viewModel.sources.length) {
            this.graphLegendContainer.selectAll('*').remove();
        };

        if (viewModel.labels[1]) {
            // Calculate positions
            let labelCoordinates = [];
            for (let i = 0; i < viewModel.sources.length; i++) {
                labelCoordinates.push({
                    lineStyle: viewModel.sources[i].lineStyle,
                    sourceName: viewModel.sources[i].sourceName,

                    x: 0.05 * width,
                    y: 0.95 * height - 20 * (viewModel.sources.length - i),
                    x2: 0.1 * width,
                    y2: 0.95 * height - 20 * (viewModel.sources.length - i),
                })        
            }
            
            let labelLines = d3.range(labelCoordinates.length).map(i => ({
                    x1: labelCoordinates[i].x,
                    y1: labelCoordinates[i].y,
                    x2: labelCoordinates[i].x + 32,
                    y2: labelCoordinates[i].y,     
                    lineStyle:  labelCoordinates[i].lineStyle,
                    sourceName: labelCoordinates[i].sourceName,
            }));

            if (this.graphLegendContainer.selectAll('text').size() !== viewModel.sources.length) {
                
                // Create lines
                this.graphLegendContainer.selectAll('line')
                    .data(labelLines)
                    .enter()
                    .append('line')

                // Create dots
                this.graphLegendContainer.selectAll('circle')
                    .data(labelLines)
                    .enter()
                    .append('circle')

                // Create text
                this.graphLegendContainer.selectAll('text')
                    .data(labelLines)
                    .enter()
                    .append('text')
            };

            // Update lines
            this.graphLegendContainer.selectAll('line')
                .data(labelLines)
                .attr('x1', d => d.x1)
                .attr('y1', d => d.y1)
                .attr('x2', d => d.x2)
                .attr('y2', d => d.y2)
                .attr('stroke', d => d.lineStyle.color)
                .attr('stroke-width', 2)
                .style('stroke-dasharray', d => d.lineStyle.style);

            // Update dots
            this.graphLegendContainer.selectAll('circle')
                .data(labelLines)
                .attr('r', 3)
                .attr('cx', d => (d.x1 + d.x2) / 2)
                .attr('cy', d => d.y1)
                .style('stroke', d => d.lineStyle.stroke)
                .style('stroke-width', 1)
                .style('fill', d => d.lineStyle.color);

            // Updates text
            this.graphLegendContainer.selectAll('text')
            .data(labelLines)
            .attr('text-anchor', 'start')
            .attr('x', d => d.x2 + 10)
            .attr('y', d => d.y1 + 3)
            .style('font-size', '' + this.visualSettings.font.sizeLegend + 'px')
            .style('fill', d => "black")
            .text(d => d.sourceName);       
        };        
    };
};