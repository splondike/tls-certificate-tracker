This is a Firefox addon which records all the root CAs your browser trusts along with the associated hostname while you're browsing the internet. The idea is to build up a list of CAs which you actually use, so you can remove the rest (to reduce the level of trust you place in unknown entities).

The data is just dumped in a hard-coded JSON file, so you'll need to edit the code a bit to change that to suit your needs.

## Development

The addon can be built and run using the [addon SDK](https://developer.mozilla.org/en-US/Add-ons/SDK). You can just use `cfx xpi` to package, and `cfx run` to run in a clean browser profile.
