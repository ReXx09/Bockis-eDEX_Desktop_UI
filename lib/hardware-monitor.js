"use strict";

const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const HELPER_NAME = "BockisHardwareMonitor.exe";

function createHardwareMonitor({
  platform = process.platform,
  isPackaged = false,
  appPath = __dirname,
  resourcesPath = process.resourcesPath,
  spawnImpl = spawn,
  timeoutMs = 15000
} = {}) {
  let child = null;
  let requestId = 0;
  let activeRequest = null;

  function helperPath() {
    return isPackaged
      ? path.join(resourcesPath, "hardware-monitor", HELPER_NAME)
      : path.join(appPath, "build", "hardware-monitor", HELPER_NAME);
  }

  function failActiveRequest(error) {
    if (!activeRequest) return;
    const request = activeRequest;
    activeRequest = null;
    clearTimeout(request.timer);
    request.reject(error);
  }

  function stopChild(processToStop) {
    if (!processToStop || processToStop !== child) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(killTimer);
        resolve();
      };
      const killTimer = setTimeout(() => {
        try {
          processToStop.kill();
        } finally {
          finish();
        }
      }, 1200);
      killTimer.unref?.();
      processToStop.once("exit", finish);
      try {
        processToStop.stdin.end(`${JSON.stringify({ type: "stop" })}\n`);
      } catch {
        processToStop.kill();
        finish();
      }
    });
  }

  function ensureProcess() {
    if (platform !== "win32") {
      throw new Error("LibreHardwareMonitor mit PawnIO wird nur unter Windows unterstützt");
    }
    if (child && !child.killed) return;

    const spawned = spawnImpl(helperPath(), [], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    child = spawned;
    let processStderr = "";
    const lines = readline.createInterface({ input: spawned.stdout });
    lines.on("line", (line) => {
      let response;
      try {
        response = JSON.parse(line);
      } catch {
        failActiveRequest(new Error("Hardware-Monitor lieferte ungültiges JSON"));
        return;
      }
      if (!activeRequest || String(response.id) !== activeRequest.id) return;
      const request = activeRequest;
      activeRequest = null;
      clearTimeout(request.timer);
      request.resolve(response);
    });
    spawned.stderr.on("data", (chunk) => {
      processStderr = `${processStderr}${chunk.toString()}`.slice(-2000);
    });
    spawned.stdin.on("error", (error) => {
      if (child === spawned) failActiveRequest(error);
    });
    spawned.on("error", (error) => {
      if (child === spawned) {
        failActiveRequest(new Error(`Hardware-Monitor konnte nicht gestartet werden: ${error.message}`));
        child = null;
      }
    });
    spawned.on("exit", (code, signal) => {
      if (child === spawned) {
        const detail = processStderr.trim();
        const reason = `Hardware-Monitor beendet (Code ${code ?? "unbekannt"}${signal ? `, ${signal}` : ""})`;
        failActiveRequest(new Error(detail ? `${reason}: ${detail}` : reason));
        child = null;
      }
      lines.close();
    });
  }

  function getSnapshot(type = "snapshot") {
    if (platform !== "win32") {
      return Promise.resolve({
        state: "unsupported",
        pawnIoInstalled: false,
        sampleAt: "",
        sensors: [],
        error: "Hardware-Monitor mit PawnIO wird nur unter Windows unterstützt"
      });
    }
    if (activeRequest) return activeRequest.promise;

    try {
      ensureProcess();
    } catch (error) {
      return Promise.reject(error);
    }

    const id = String(++requestId);
    let resolveRequest;
    let rejectRequest;
    const promise = new Promise((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    const timer = setTimeout(() => {
      failActiveRequest(new Error("Zeitüberschreitung beim Lesen der Hardware-Sensoren"));
      try {
        child?.kill();
      } catch {
        // The helper is already being torn down.
      }
    }, timeoutMs);
    timer.unref?.();
    activeRequest = {
      id,
      promise,
      resolve: resolveRequest,
      reject: rejectRequest,
      timer
    };
    try {
      child.stdin.write(`${JSON.stringify({ id, type })}\n`, (error) => {
        if (error && activeRequest?.id === id) failActiveRequest(error);
      });
    } catch (error) {
      failActiveRequest(error);
    }
    return promise;
  }

  async function stop() {
    const processToStop = child;
    if (!processToStop) return;
    failActiveRequest(new Error("Hardware-Monitor wird beendet"));
    await stopChild(processToStop);
    if (child === processToStop) child = null;
  }

  return { getSnapshot, stop };
}

module.exports = { createHardwareMonitor };
