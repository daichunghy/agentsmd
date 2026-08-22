# How to publish agentsmd (simple)

The CLI is not on npm until you finish these steps once. After that,
`npx agentsmd doctor` works on any computer.

## 1. Create a free npm account

1. Open https://www.npmjs.com/signup
2. Confirm the email.

## 2. Create an access token

1. Open https://www.npmjs.com/settings/~/tokens
2. Generate a **Granular Access Token** with permission to publish
   `agentsmd`.
3. Copy the token.

## 3. Put the token on GitHub

1. Open https://github.com/daichunghy/agentsmd/settings/secrets/actions
2. **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: paste the token
5. Save

## 4. Tell me (or run)

After the secret exists, creating git tag `v0.1.0-alpha.2` publishes the
package. Do not claim download counts until https://www.npmjs.com/package/agentsmd
loads.
