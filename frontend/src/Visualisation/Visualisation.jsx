import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const Visualization = ({ data }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const width = 500;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .style("background", "#f9f9f9")
            .style("overflow", "visible");

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(0.4);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .nice()
            .range([height - margin.bottom, margin.top]);

        svg.selectAll("*").remove();

        svg.append("g")
            .attr("transform", `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("transform", `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yScale));

        const line = d3.line()
            .x(d => xScale(d.label) + xScale.bandwidth() / 2)
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("cy", d => yScale(d.value))
            .attr("r", 4)
            .attr("fill", "steelblue");

    }, [data]);

    return <svg ref={svgRef}></svg>;
};

export default Visualization;
