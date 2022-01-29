### NOTE
Editing file contents is fine (that is the goal of the config folder), but renaming or adding folders/files means the folder structure will break away from the virkshop specification.

The one exception for adding files is if your file starts with `#comment# ` (note the trailing space) then you can add as many files like that as you want.


### Why a folder?
This config folder is effectively a replacement for `config.yaml` or `config.json` or `config.toml`. 
Those files would be great, except this config needs to be read BEFORE entering the workshop.
In general, all of those other kinds of config files need a supporting libray to parse/edit.
Before we enter the virkshop, we only (reliably) have access POSIX commands or GNU coreutils.
Meaning there wouldn't be a good lightweight way to extract the config information.

This format also means and language with file access can read the config.
Its possible this will change in the future as config files become more standardizied.
Who knows maybe POSIX will eventually include a command that can parse one of those formats.

# How does it work
Every file/folder is like a key in a dictionary, and the contents of the file/folder are the value of the key
