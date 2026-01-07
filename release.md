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

Or if already initialized, run the update script:

```
> ./update.sh
```

This will load all configured curriculum repositories. If you need to add a curriculum repository, edit the file `curriculum-contexts.txt`.

Then test if all the to-be-released data is valid.

```
> npm test
```

All contexts should say `Data is valid!`. If not, fix the data first (See below.)

This test does not check if there are any orphans. This needs to be checked. And any orphans (except doelniveau) that aren't root entities, must be marked deleted.
See the orphans query at the bottom.

Then if all is well, run the release script:

```
> npm run release
```

Then copy any changes in the `context.json` files from the `editor/` to the `release/` folders using the following script:
```
./copyContext.sh
```
Then test if the release data is valid:

```
> npm run test-release
```

For advanced user: sanity check(s): if you know what the data should look like, check the differences between your local changes and the git remote:
For example the file deprecated.json:
```
cd release/curriculum-basis/data/
git diff deprecated.json
```

If there are no problems, commit and push everything in `release/` to git repository.
For example the contents of curriculum-basis:
```
> cd release/curriculum-basis/
> git commit -a
> git push
```

Do this for each curriculum repository in the `release/` folder.

Now go to github and for each curriculum repository add a new release tag for the master branch.

Then copy the released data back to the editor repositories:

```
> ./copy-release-data.sh
```

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

## Post release checks

Verify if https://opendata.slo.nl/curriculum/api/v1/ show the correct version.
Verify if https://leerplaninbeeld.slo.nl/ is working correctly.

## Orphans query

```javascript
	const Type = o => JSONTag.getAttribute(o,"class")
	let types = Object.keys(meta.schema.types)
	.filter(t => !meta.schema.types[t].root)

	let allOrphans = []
	for (const type of types) {
	  let orphans = from(data[type])
	  .filter((o) => !o.root)
	  allOrphans = allOrphans.concat(orphans)
	}

	from(allOrphans)
	.select({
	  type: Type,
	  id: _,
	  title: _
	})
```

Let op: timeout van 1 seconde is te kort, ophogen in query-worker-module.mjs