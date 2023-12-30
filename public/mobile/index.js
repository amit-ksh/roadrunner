let ready = false;
window.onload = function () {
  const socket = io();
  const button = document.querySelector("button#start");

  if (navigator.userAgentData.mobile) {
    const mobileView = document.getElementById("mobile");
    mobileView.style.display = "block";
  } else {
    const desktopView = document.getElementById("desktop");
    desktopView.style.display = "block";
  }

  if (navigator.userAgentData.mobile) {
    function handleOrientation(e) {
      if (ready) {
        socket.emit("orientation", e.gamma);
      }
    }

    window.addEventListener("deviceorientation", handleOrientation, true);
    button.addEventListener("click", startGame);

    function startGame() {
      socket.emit("mobile connected");
      socket.on("start", () => (ready = true));
      button.removeEventListener("touchstart", startGame);
      button.innerHTML = "Playing!";
    }
  }
};
