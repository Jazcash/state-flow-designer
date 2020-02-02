import "reset-css/sass/_reset";
import "./style";

import * as go from "./go-debug";

declare var window: any;

const $ = go.GraphObject.make;

const diagram = window.diagram = createDiagram();

const btnLayout = document.getElementById("btnLayout") as HTMLButtonElement;
const btnState = document.getElementById("btnState") as HTMLButtonElement;
const btnSort = document.getElementById("btnSort") as HTMLButtonElement;
const btnClear = document.getElementById("btnClear") as HTMLButtonElement;
const stateModal = document.getElementById("stateModal") as HTMLElement;
const layoutModal = document.getElementById("layoutModal") as HTMLElement;
const txtLayout = document.getElementById("txtLayout") as HTMLTextAreaElement;
const txtState = document.getElementById("txtState") as HTMLTextAreaElement;

const modelStr = localStorage.getItem("layoutConfig");
if (modelStr !== null) {
	const modelObj = JSON.parse(modelStr);
	diagram.model = $(go.GraphLinksModel, {
		linkFromPortIdProperty: "fromPort",
		nodeDataArray: modelObj.nodeDataArray,
		linkDataArray: modelObj.linkDataArray
	});
	updateLayoutConfig();
	updateStateConfig();
}

btnLayout.addEventListener("click", () => {
	stateModal.classList.add("hidden");
	layoutModal.classList.toggle("hidden");
});

btnState.addEventListener("click", () => {
	layoutModal.classList.add("hidden");
	stateModal.classList.toggle("hidden");
});

btnSort.addEventListener("click", () => {
	diagram.startTransaction("sort");
	diagram.layout = $(go.ForceDirectedLayout);
	diagram.commitTransaction("sort");
});

btnClear.addEventListener("click", () => {
	const promptResponse = confirm("Are you sure you want to clear the diagram? This action cannot be undone.");
	if (!promptResponse) return;

	diagram.clear();
	updateLayoutConfig();
	updateStateConfig();
});

diagram.addDiagramListener("Modified", () => {
	updateLayoutConfig();
	updateStateConfig();
});

diagram.addModelChangedListener(() => {
	updateLayoutConfig();
	updateStateConfig();
});

function updateLayoutConfig() {
	const layoutConfig = JSON.parse(diagram.model.toJson());
	txtLayout.innerHTML = JSON.stringify(layoutConfig, null, 4);
	localStorage.setItem("layoutConfig", JSON.stringify(layoutConfig));
}

function updateStateConfig() {
	const stateConfig = generateStateConfig();
	txtState.innerHTML = JSON.stringify(stateConfig, null, 4);
}

function generateStateConfig() {
	const startNode = diagram.findNodeForKey("Init");

	if (!startNode) {
		return {};
	}

	const stateConfig: any = {
		states: [],
		decisions: [],
		superStates: []
	}

	diagram.nodes.each(node => {
		const state: any = {
			id: node.key,
			links: {}
		};

		node.findLinksOutOf().each(link => {
			state.links[link.fromPortId] = link.toNode!.key;
		});

		if (node.category === "Start") {
			state.entryPoint = true;
			stateConfig.states.push(state);
		} else if (node.category === "State") {
			if (node.data.turbo) {
				state.turboSkip = true;
			}
			if (node.data.cascade) {
				state.cascadeSkip = true;
			}
			stateConfig.states.push(state);
		} else if (node.category === "Conditional") {
			stateConfig.decisions.push(state);
		}
	});

	return stateConfig;
}

function createDiagram(): go.Diagram {
	const diagram = $(go.Diagram, "diagram", {
		"undoManager.isEnabled": true,
		"LinkDrawn": showLinkLabel,
		"LinkRelinked": showLinkLabel,
		"toolManager.hoverDelay": 0
	});

	const textStyle1 = {
		font: "bold 11pt Lato, Helvetica, Arial, sans-serif",
		stroke: "#F8F8F8"
	}

	const textStyle2 = {
		font: "9pt Lato, Helvetica, Arial, sans-serif",
		stroke: "#F8F8F8"
	}

	diagram.nodeTemplateMap.add("Start",
		$(go.Node, "Table", nodeStyle(),
			$(go.Panel, "Spot",
				$(go.Shape, "Circle", {
					desiredSize: new go.Size(70, 70),
					fill: "#282c34",
					stroke: "#09d3ac",
					strokeWidth: 3.5
				}),

				$(go.Panel, "Vertical",
					$(go.TextBlock, textStyle1, {
						margin: new go.Margin(5, 0, 0, 0),
						maxSize: new go.Size(160, NaN),
						wrap: go.TextBlock.WrapFit,
						editable: true,
					}, new go.Binding("text", "key").makeTwoWay()),
				)
			),
			makePort("error", go.Spot.Left, go.Spot.Left, true, false),
			makePort("skip", go.Spot.Right, go.Spot.Right, true, false),
			makePort("complete", go.Spot.Bottom, go.Spot.Bottom, true, false),
		));

	diagram.nodeTemplateMap.add("State",
		$(go.Node, "Table", nodeStyle(),
			$(go.Panel, "Auto",
				$(go.Shape, "Rectangle", {
					fill: "#282c34",
					stroke: "#00A9C9",
					strokeWidth: 3.5
				}, new go.Binding("figure", "figure")),

				$(go.Panel, "Vertical",
					$(go.TextBlock, textStyle1, {
						margin: new go.Margin(10, 10, 0, 10),
						maxSize: new go.Size(160, NaN),
						wrap: go.TextBlock.WrapFit,
						editable: true,
					}, new go.Binding("text", "key").makeTwoWay()),

					$("CheckBox", "turbo", { margin: new go.Margin(0, 10, 5, 10) },
						$(go.TextBlock, textStyle2, "Turbo Skip")
					),

					$("CheckBox", "cascade", { margin: new go.Margin(0, 10, 10, 10) },
						$(go.TextBlock, textStyle2, "Cascade Skip")
					),
				)
			),
			makePort("in", go.Spot.Top, go.Spot.TopSide, false, true),
			makePort("error", go.Spot.Left, go.Spot.LeftSide, true, true),
			makePort("skip", go.Spot.Right, go.Spot.RightSide, true, true),
			makePort("complete", go.Spot.Bottom, go.Spot.BottomSide, true, false)
		));

	diagram.nodeTemplateMap.add("Conditional",
		$(go.Node, "Table", nodeStyle(),
			$(go.Panel, "Auto",
				$(go.Shape, "Diamond", {
					fill: "#282c34",
					stroke: "#8c649c",
					strokeWidth: 3.5
				}),

				$(go.Panel, "Vertical",
					$(go.TextBlock, textStyle1, {
						margin: new go.Margin(5, 0, 0, 0),
						maxSize: new go.Size(160, NaN),
						wrap: go.TextBlock.WrapFit,
						editable: true,
					}, new go.Binding("text", "key").makeTwoWay()),

					$(go.TextBlock, textStyle1, {
						margin: new go.Margin(0, 0, 5, 0),
						maxSize: new go.Size(160, NaN),
						wrap: go.TextBlock.WrapFit,
						editable: true
					}, new go.Binding("text", "concrete").makeTwoWay())
				)
			),
			makePort("in", go.Spot.Top, go.Spot.Top, false, true),
			makePort("false", go.Spot.Left, go.Spot.Left, true, false),
			makePort("true", go.Spot.Right, go.Spot.Right, true, false),
		));

	diagram.nodeTemplateMap.add("SuperState",
		$(go.Node, "Table", nodeStyle(),
			$(go.Panel, "Auto",
				$(go.Shape, "Rectangle", {
					fill: "#282c34",
					stroke: "orange",
					strokeWidth: 3.5,
					portId: "",
					cursor: "pointer",
					fromLinkable: true,
					toLinkable: true,
					fromLinkableSelfNode: true,
					toLinkableSelfNode: true
				}),

				$(go.TextBlock, textStyle1, {
					margin: 5,
					editable: true
				},
					new go.Binding("text", "key"))
	)));

	go.Shape.defineFigureGenerator("File", function (shape, w, h) {
		var geo = new go.Geometry();
		var fig = new go.PathFigure(0, 0, true);
		geo.add(fig);
		fig.add(new go.PathSegment(go.PathSegment.Line, .75 * w, 0));
		fig.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
		fig.add(new go.PathSegment(go.PathSegment.Line, w, h));
		fig.add(new go.PathSegment(go.PathSegment.Line, 0, h).close());
		var fig2 = new go.PathFigure(.75 * w, 0, false);
		geo.add(fig2);
		// The Fold
		fig2.add(new go.PathSegment(go.PathSegment.Line, .75 * w, .25 * h));
		fig2.add(new go.PathSegment(go.PathSegment.Line, w, .25 * h));
		geo.spot1 = new go.Spot(0, .25);
		geo.spot2 = go.Spot.BottomRight;
		return geo;
	});

	diagram.nodeTemplateMap.add("Comment",
		$(go.Node, "Auto", nodeStyle(),
			$(go.Shape, "File", {
				fill: "#282c34",
				stroke: "#DEE0A3",
				strokeWidth: 3
			}),
			$(go.TextBlock, textStyle1, {
				margin: 8,
				maxSize: new go.Size(200, NaN),
				wrap: go.TextBlock.WrapFit,
				textAlign: "center",
				editable: true
			},
				new go.Binding("text").makeTwoWay())
		));

	diagram.linkTemplate = $(go.Link,
		{
			routing: go.Link.AvoidsNodes,
			curve: go.Link.JumpOver,
			corner: 5,
			toShortLength: 4,
			relinkableFrom: true,
			relinkableTo: true,
			reshapable: true,
			resegmentable: true,
			toolTip: $("ToolTip",
				$(go.TextBlock, { margin: 4 }, new go.Binding("text", "fromPort"))
			),
			mouseEnter: function (e, obj) {
				const node = obj as go.Node;
				const link = node.findObject("HIGHLIGHT") as go.Shape;
				link.stroke = "rgba(30,144,255,0.2)";
			},
			mouseLeave: function (e, obj) {
				const node = obj as go.Node;
				const link = node.findObject("HIGHLIGHT") as go.Shape;
				link.stroke = "transparent";
			},
			selectionAdorned: false
		},
		new go.Binding("points").makeTwoWay(),
		$(go.Shape, // the highlight shape, normally transparent
			{
				isPanelMain: true,
				strokeWidth: 8,
				stroke: "transparent",
				name: "HIGHLIGHT"
			}),
		$(go.Shape, // the link path shape
			{
				isPanelMain: true,
				stroke: "white",
				strokeWidth: 2
			},
			new go.Binding("stroke", "", linkColor).ofObject()),
		$(go.Shape, // the arrowhead
			{
				toArrow: "standard",
				strokeWidth: 0
			},
			new go.Binding("fill", "", linkColor).ofObject(),
		),
		// $(go.Panel, "Auto", // the link label, normally not visible
		// 	{
		// 		visible: false,
		// 		name: "LABEL",
		// 		segmentIndex: 2,
		// 		segmentFraction: 0.5
		// 	},
		// 	new go.Binding("visible", "visible").makeTwoWay(),
		// 	$(go.Shape, "RoundedRectangle", // the label shape
		// 		{
		// 			fill: "#F8F8F8",
		// 			strokeWidth: 0
		// 		}),
		// 	$(go.TextBlock, // the label
		// 		{
		// 			textAlign: "center",
		// 			font: "10pt helvetica, arial, sans-serif",
		// 			stroke: "#333333"
		// 		},
		// 		new go.Binding("text", "", (tst) => {
		// 			return tst.fromPort;
		// 		}).makeTwoWay())
		// )
	);

	// Make link labels visible if coming out of a "conditional" node.
	// This listener is called by the "LinkDrawn" and "LinkRelinked" DiagramEvents.
	function showLinkLabel(e: go.DiagramEvent) {
		var label = e.subject.findObject("LABEL");
		if (label !== null) label.visible = (e.subject.fromNode.data.category === "Conditional");
	}

	function linkColor(link: go.Link) {
		if (link.isSelected) {
			return "dodgerblue";
		}

		switch (link.fromPortId) {
			case "complete": return "#eee";
			case "skip": return "orange";
			case "error": return "red";
			case "true": return "#7bb576";
			case "false": return "#cf5b53";
			default: return "#fff";
		}
	}

	const palette = $(go.Palette, "palette", {
		"animationManager.initialAnimationStyle": go.AnimationManager.None,
		nodeTemplateMap: diagram.nodeTemplateMap,
		model: $(go.GraphLinksModel, {
			linkFromPortIdProperty: "fromPort",
			nodeDataArray: [
				{
					category: "Start",
					key: "Init"
				},
				{
					category: "State",
					key: "State"
				},
				{
					category: "Conditional",
					key: "Decision",
					concrete: "Concrete"
				},
				{
					category: "SuperState",
					key: "SuperState"
				},
				{
					category: "Comment",
					text: "Comment"
				}
			]
		})
	});

	function nodeStyle() {
		return [
			new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
			{
				locationSpot: go.Spot.Center,
			}
		];
	}

	function makePort(name: string, align: go.Spot, spot: go.Spot, output: boolean, input: boolean) {
		var horizontal = align.equals(go.Spot.Top) || align.equals(go.Spot.Bottom);
		return $(go.Shape, {
			fill: "transparent",
			strokeWidth: 0,
			width: horizontal ? NaN : 8, // if not stretching horizontally, just 8 wide
			height: !horizontal ? NaN : 8, // if not stretching vertically, just 8 tall
			alignment: align, // align the port on the main Shape
			stretch: (horizontal ? go.GraphObject.Horizontal : go.GraphObject.Vertical),
			portId: name, // declare this object to be a "port"
			fromSpot: spot, // declare where links may connect at this port
			fromLinkable: output, // declare whether the user may draw links from here
			toSpot: spot, // declare where links may connect at this port
			toLinkable: input, // declare whether the user may draw links to here
			cursor: "pointer", // show a different cursor to indicate potential link point
			fromMaxLinks: 1,
			fromLinkableSelfNode: true,
			toLinkableSelfNode: true,
			mouseEnter: function (e: go.InputEvent, obj: go.GraphObject) {
				const port = obj as go.Shape;
				if (!e.diagram.isReadOnly) {
					port.fill = "rgba(255,0,255,0.5)";
				}
			},
			mouseLeave: (e: go.InputEvent, obj: go.GraphObject) => {
				const port = obj as go.Shape;
				port.fill = "transparent";
			},
		});
	}

	function addExitPort(){

	}

	// diagram.toolManager.linkingTool.linkValidation = function (fromnode, fromport, tonode, toport) {

	// 	console.log(fromnode.category);

	// 	if (fromnode.category === "Decision"){
	// 		return fromnode.findLinksTo(tonode).count < 2;
	// 	} else {
	// 		return fromnode.findLinksTo(tonode).count < 1;
	// 	}
	// }

	return diagram;
}