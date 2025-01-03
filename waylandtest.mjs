import open_display from "wayland-client";
const wl_display = await open_display();
await wl_display.load("protocol/xdg-shell.xml");
// await wl_display.load("protocol/wayland.json");
// await wl_display.load("protocol/wayland.xml");
let Xdg_toplevel = await wl_display.bind("xdg_toplevel");

async function getWaylandSeat() {
    const wl_display = await open_display();
    const wl_registry = wl_display.wl_registry;

    let wl_seat = null;

    wl_registry.on("global", (id, wl_interface) => {
        if (wl_interface === "wl_seat") {
            wl_seat = wl_registry.bind(id, "wl_seat", 1);
        }
    });

    await wl_display.sync();

    if (!wl_seat) {
        throw new Error("wl_seat not found");
    }

    return wl_seat;
}

// const wl_seat = await getWaylandSeat();

Xdg_toplevel().show_window_menu(wl_seat, 0, 0, 0);
Xdg_toplevel.show_window_menu(null, 0, 0, 0);

