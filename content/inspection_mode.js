let selectedElement = null;
let dynamicFunction = null;

function Inspector() {
    return {enableInspectMode, disableInspectMode, setDynamicFunction};
}

function enableInspectMode() {
    console.log("Inspect Mode Enabled");
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("click", onClick);
}

function disableInspectMode() {
    console.log("Inspect Mode Disabled");
    removeHighlightStyle();
    document.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("mouseout", onMouseOut);
    document.removeEventListener("click", onClick);
    selectedElement = null;
    dynamicFunction = null; // Reset the dynamic function
}

function removeHighlightStyle() {
    if (selectedElement) {
        selectedElement.classList.remove("highlight");
    }
}

function onMouseOver(event) {
    if (selectedElement) return;
    event.target.classList.add("highlight");
}

function onMouseOut(event) {
    if (selectedElement) return;
    event.target.classList.remove("highlight");
}

function onClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (selectedElement) {
        selectedElement.classList.remove("highlight");
    }
    selectedElement = event.target;
    selectedElement.classList.add("highlight");

    if (dynamicFunction) {
        dynamicFunction(selectedElement);
    }

    disableInspectMode();
}

function setDynamicFunction(fn) {
    if (typeof fn === "function") {
        dynamicFunction = fn;
    } else {
        console.error("Provided argument is not a function");
    }
}
