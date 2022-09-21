import backend from "mid-backend";

console.log("Driver loaded.");

backend().then(backend => {
    backend.boot();
});
