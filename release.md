# opendata.slo.nl/curriculum/ release procedure

Start bij checking out the curriculum-utils repo (this one):

```
> git clone git@github.com:slonl/curriculum-utils
```

Then cd to it and initialize it:

```
> cd curriculum-utils
> npm install
> ./init.sh
```

This will load all configured curriculum repositories. If you need to add a curriculum repository, edit the file `curriculum-contexts.txt`.

Then test if all the to-be-released data is valid.

```
> npm test
```

All contexts should say `Data is valid!`. If not, fix the data first (See below.)

Then if all is well, run the release script:

```
> npm run release
```

Then copy any changes in the `context.json` files from the `editor/` to the `master/` folders.

Then test if the release data is valid:

```
> npm run test-release
```

If there are no problems, commit and push all `master/` git repositories.

```
> cd master/curriculum-basis/
> git commit -a
> git push
```

Do this for each curriculum repository in the `master/` folder.

Now go to github and for each curriculum repository add a new release tag for the master branch.

Then copy the released data back to the editor repositories:

```
> cp master/curriculum-basis/data/* editor/curriculum-basis/data/
```

Do this for each curriculum repository.

Then commit and push the `editor/` curriculum repositories:

```
> cd editor/curriculum-basis/
> git commit -a
> git push
```

## Fixing problems in the data

If you run into errors when running `npm test`, you can check the data for each error like this:

Say one of the error messages looks like this:

```
error: examenprogramma: /examenprogramma_domein/575: some error message
```

Then you can check which entity this is, and show it like this:

```
> cd editor/curriculum-examenprogramma/data/
> jq .[575] domeinen.json
```

You must have `jq` installed. In Ubuntu this is done with `apt-get install jq`.