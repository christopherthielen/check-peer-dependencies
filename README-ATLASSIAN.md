# Atlassian fork of check-peer-dependencies

This fork contains some modifications that only check internal peer dependencies which are scoped under `@atlaskit`, `@atlassian` or `@atlassiansox`.

## Changes

1. Only check peer dependencies for internal packages
2. Add feature flag https://app.launchdarkly.com/atlassian-frontend/production/features/peer-dependency-enforcement_operational/targeting to turn on/off the check
3. Skip the check when on certain branch. This is mainly used to bypass the check in product integrator.

## Build&Publish

1. bump the version in package.json
2. run `yarn build`
3. run `npm publish`
