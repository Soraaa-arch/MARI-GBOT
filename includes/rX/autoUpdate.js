/**
 * GIT AUTO UPDATE SYSTEM
 * -----------------------
 * Reads `gitUpdate` from config.json:
 *   "gitUpdate": {
 *       "autoUpdate": true,          // true = check + self update on every boot, false = skip
 *       "url": "https://github.com/owner/repo",
 *       "branch": "main",            // optional, auto-detected if omitted
 *       "protect": ["myCustomFolder"] // optional, extra files/folders to never overwrite
 *   }
 *
 * Flow: fetch remote package.json -> compare version with local package.json
 * -> if remote is newer, download the repo zip, overwrite local files (except
 * protected/user-owned files), then exit(2) so the process manager (PM2 /
 * nodemon / a bash restart-loop) brings the bot back up on the new code.
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const log = require("../../utils/logger/log.js");

// Never touch these when copying updated files over the project — they're
// either user secrets/config or runtime data, not part of the bot's code.
const DEFAULT_PROTECTED_PATHS = [
	"config.json",
	"config.dev.json",
	"configCommands.json",
	"configCommands.dev.json",
	"account.txt",
	"account.dev.txt",
	"appstate.txt",
	"appstate.json",
	"appstate.dev.txt",
	"appstate.dev.json",
	"node_modules",
	".git",
	"package-lock.json",
	".autoupdate_tmp",
	"database.sqlite",
	"includes/data"
];

function getGitRemoteUrl(rootDir) {
	try {
		const { execSync } = require("child_process");
		let url = execSync("git config --get remote.origin.url", { cwd: rootDir, stdio: "pipe" }).toString().trim();
		if (url) {
			if (url.startsWith("git@github.com:")) {
				url = url.replace("git@github.com:", "https://github.com/");
			}
			if (url.endsWith(".git")) {
				url = url.slice(0, -4);
			}
			return url;
		}
	} catch {
		// Ignore if git command fails or not in git repo
	}
	return null;
}

function parseGitUrl(url) {
	const match = String(url).replace(/\.git$/, "").match(/github\.com\/([^\/]+)\/([^\/]+)/i);
	if (!match) throw new Error(`"gitUpdate.url" is not a valid GitHub repo URL: ${url}`);
	return { owner: match[1], repo: match[2] };
}

function compareVersion(version1, version2) {
	const v1 = String(version1).split(".").map(n => parseInt(n) || 0);
	const v2 = String(version2).split(".").map(n => parseInt(n) || 0);
	for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
		if ((v1[i] || 0) > (v2[i] || 0)) return 1;
		if ((v1[i] || 0) < (v2[i] || 0)) return -1;
	}
	return 0;
}

async function getDefaultBranch(owner, repo) {
	try {
		const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { timeout: 10000 });
		return data.default_branch || "main";
	} catch {
		return "main";
	}
}

async function fetchRemotePackageJson(owner, repo, branch) {
	try {
		const { data } = await axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`, { timeout: 10000 });
		return typeof data === "string" ? JSON.parse(data) : data;
	} catch (err) {
		log.warn("AUTO UPDATE", `Failed to fetch remote package.json from ${owner}/${repo} on branch "${branch}": ${err.message}`);
		throw err;
	}
}

async function downloadAndExtractZip(owner, repo, branch, destDir) {
	const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
	const { data } = await axios.get(zipUrl, { responseType: "arraybuffer", timeout: 120000 });
	const zip = new AdmZip(Buffer.from(data));
	zip.extractAllTo(destDir, true);

	// GitHub zips always extract into a single "<repo>-<branch>" root folder
	const extractedFolder = fs.readdirSync(destDir).find(f => fs.statSync(path.join(destDir, f)).isDirectory());
	if (!extractedFolder) throw new Error("Failed to extract downloaded update zip");
	return path.join(destDir, extractedFolder);
}

function isProtected(relPath, protectedPaths) {
	const normalized = relPath.split(path.sep).join("/");
	return protectedPaths.some(p => normalized === p || normalized.startsWith(p + "/"));
}

function copyRecursiveSkipProtected(srcDir, destRootDir, protectedPaths, relBase = "") {
	for (const entry of fs.readdirSync(srcDir)) {
		const relPath = relBase ? `${relBase}/${entry}` : entry;
		if (isProtected(relPath, protectedPaths)) continue;

		const srcPath = path.join(srcDir, entry);
		const destPath = path.join(destRootDir, relPath);

		if (fs.statSync(srcPath).isDirectory()) {
			fs.ensureDirSync(destPath);
			copyRecursiveSkipProtected(srcPath, destRootDir, protectedPaths, relPath);
		} else {
			fs.ensureDirSync(path.dirname(destPath));
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Checks config.json's `gitUpdate` block and self-updates the bot if a newer
 * version is found on the given public GitHub repo. Does nothing if
 * `gitUpdate.autoUpdate` is not `true` or `gitUpdate.url` is missing.
 *
 * @param {string} rootDir - project root directory (defaults to process.cwd())
 * @returns {Promise<boolean>} true if an update was applied (process is about to exit), false otherwise
 */
async function checkAndSelfUpdate(rootDir = process.cwd(), options = {}) {
	const { force = false, notifyThreadID = null } = options;

	let config;
	try {
		config = global.GoatBot?.config || require(path.join(rootDir, "config.json"));
	} catch (configErr) {
		log.err("AUTO UPDATE", "Failed to load config.json, skipping auto update check.", configErr);
		return { updated: false, error: configErr.message };
	}

	const gitUpdate = config.gitUpdate;
	if (!gitUpdate) {
		log.warn("AUTO UPDATE", "No \"gitUpdate\" block found in config.json.");
		return { updated: false, noRepo: true };
	}
	if (!force && gitUpdate.autoUpdate !== true) {
		log.info("AUTO UPDATE", "Git auto update is disabled (set config.json > gitUpdate.autoUpdate to true to enable).");
		return { updated: false, disabled: true };
	}

	let gitUrl = gitUpdate.url || getGitRemoteUrl(rootDir);
	if (!gitUrl) {
		log.warn("AUTO UPDATE", "Git auto update is enabled but no git repository URL could be found or auto-detected.");
		return { updated: false, noRepo: true };
	}

	try {
		let owner, repo;
		try {
			const parsed = parseGitUrl(gitUrl);
			owner = parsed.owner;
			repo = parsed.repo;
		} catch (parseErr) {
			const fallbackUrl = gitUpdate.url ? getGitRemoteUrl(rootDir) : null;
			if (fallbackUrl && fallbackUrl !== gitUpdate.url) {
				log.warn("AUTO UPDATE", `Configured URL "${gitUpdate.url}" is invalid. Trying auto-detected remote: "${fallbackUrl}"...`);
				const parsed = parseGitUrl(fallbackUrl);
				owner = parsed.owner;
				repo = parsed.repo;
				gitUrl = fallbackUrl;
			} else {
				throw parseErr;
			}
		}

		let branch = gitUpdate.branch || await getDefaultBranch(owner, repo);
		let remotePkg;

		async function tryFetchWithBranchFallback(curOwner, curRepo, curBranch) {
			try {
				return { pkg: await fetchRemotePackageJson(curOwner, curRepo, curBranch), activeBranch: curBranch };
			} catch (err) {
				if (!gitUpdate.branch && (curBranch === "main" || curBranch === "master") && err.response?.status === 404) {
					const fallbackBranch = curBranch === "main" ? "master" : "main";
					log.info("AUTO UPDATE", `Failed to fetch from branch "${curBranch}", trying fallback branch "${fallbackBranch}"...`);
					const pkg = await fetchRemotePackageJson(curOwner, curRepo, fallbackBranch);
					return { pkg, activeBranch: fallbackBranch };
				}
				throw err;
			}
		}

		try {
			const fetchResult = await tryFetchWithBranchFallback(owner, repo, branch);
			remotePkg = fetchResult.pkg;
			branch = fetchResult.activeBranch;
		} catch (err) {
			const fallbackUrl = gitUpdate.url ? getGitRemoteUrl(rootDir) : null;
			if (fallbackUrl && fallbackUrl !== gitUpdate.url) {
				log.warn("AUTO UPDATE", `Configured repo "${owner}/${repo}" fetch failed (${err.message}). Trying auto-detected remote: "${fallbackUrl}"...`);
				const fallbackParsed = parseGitUrl(fallbackUrl);
				const fallbackOwner = fallbackParsed.owner;
				const fallbackRepo = fallbackParsed.repo;
				const fallbackBranch = gitUpdate.branch || await getDefaultBranch(fallbackOwner, fallbackRepo);
				const fetchResult = await tryFetchWithBranchFallback(fallbackOwner, fallbackRepo, fallbackBranch);
				remotePkg = fetchResult.pkg;
				branch = fetchResult.activeBranch;
				owner = fallbackOwner;
				repo = fallbackRepo;
				gitUrl = fallbackUrl;
			} else {
				throw err;
			}
		}

		let localPkg;
		try {
			localPkg = require(path.join(rootDir, "package.json"));
		} catch (pkgErr) {
			log.err("AUTO UPDATE", "Failed to load local package.json", pkgErr);
			return false;
		}

		if (!remotePkg.version) {
			log.warn("AUTO UPDATE", "Remote package.json has no version field, skipping.");
			return false;
		}

		if (compareVersion(remotePkg.version, localPkg.version) <= 0) {
			log.info("AUTO UPDATE", `Bot is already up to date (v${localPkg.version}).`);
			return { updated: false, localVersion: localPkg.version, remoteVersion: remotePkg.version };
		}

		log.master("AUTO UPDATE", `New version found on ${owner}/${repo}: v${localPkg.version} → v${remotePkg.version}. Downloading update...`);

		const tmpDir = path.join(rootDir, ".autoupdate_tmp");
		fs.emptyDirSync(tmpDir);

		const extractedRoot = await downloadAndExtractZip(owner, repo, branch, tmpDir);
		const protectedPaths = [...DEFAULT_PROTECTED_PATHS, ...(Array.isArray(gitUpdate.protect) ? gitUpdate.protect : [])];

		copyRecursiveSkipProtected(extractedRoot, rootDir, protectedPaths);
		fs.removeSync(tmpDir);

		// Check if package.json dependencies changed, and if so, run npm install
		let depsChanged = false;
		const remoteDeps = remotePkg.dependencies || {};
		const localDeps = localPkg.dependencies || {};
		const remoteKeys = Object.keys(remoteDeps);
		const localKeys = Object.keys(localDeps);

		if (remoteKeys.length !== localKeys.length) {
			depsChanged = true;
		} else {
			for (const key of remoteKeys) {
				if (remoteDeps[key] !== localDeps[key]) {
					depsChanged = true;
					break;
				}
			}
		}

		if (depsChanged) {
			log.info("AUTO UPDATE", "Dependencies in package.json have changed. Running 'npm install' to update dependencies...");
			try {
				const { execSync } = require("child_process");
				execSync("npm install --no-audit --no-fund", { cwd: rootDir, stdio: "inherit" });
				log.success("AUTO UPDATE", "Dependencies updated successfully.");
			} catch (npmErr) {
				log.err("AUTO UPDATE", "Failed to automatically install updated dependencies. Please run 'npm install' manually.", npmErr);
			}
		}

		log.master("AUTO UPDATE", `Update applied: v${localPkg.version} → v${remotePkg.version}. Restarting bot to load new code...`);

		if (notifyThreadID) {
			try {
				const markerDir = path.join(rootDir, "modules", "cmds", "tmp");
				fs.ensureDirSync(markerDir);
				fs.writeFileSync(path.join(markerDir, "update.txt"), `${notifyThreadID} ${Date.now()} ${localPkg.version} ${remotePkg.version}`);
			} catch (markerErr) {
				log.warn("AUTO UPDATE", `Failed to write update notification marker: ${markerErr.message}`);
			}
		}

		// Exit code 2 signals a "please restart me" to process managers
		// (PM2, nodemon, or a simple bash restart-loop), same convention
		// already used by the chat "restart" command in this project.
		process.exit(2);
		return { updated: true, localVersion: localPkg.version, remoteVersion: remotePkg.version };
	} catch (err) {
		log.err("AUTO UPDATE", "Failed to check/apply git auto update", err);
		return { updated: false, error: err.message };
	}
}

module.exports = {
	checkAndSelfUpdate,
	compareVersion,
	parseGitUrl
};
