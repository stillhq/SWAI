This is a branch for making all SWAI apps run on one instance of SWAI. The point of this is that SWAI apps can launch each other and integrate with each other.

The problem is through GNOME Extensions, Mutter, and Electron there is no way to to the wm_class per window, it is only able to be set by the application and Electron doesn't have an api for it.

We may revert back to this branch if we find a way to patch Mutter to allow changing the wm_class.

We also have an issue open in Electron to add this feature: https://github.com/electron/electron/issues/45866

For now, SWAI apps will have to be isolated to themselves for now.
