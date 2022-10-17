import { loadPyodide } from "pyodide";

async function main() {
  let pyodide = await loadPyodide();
  // Pyodide is now ready to use...
  console.log(pyodide.runPython(`
    import sys
    sys.version
  `));
};
main();

