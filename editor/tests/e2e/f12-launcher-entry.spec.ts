import { expect, test } from '@playwright/test';
import { graphDocumentToPatch } from '@din/react/patch';
import { createInitialGraphDocument } from '../../ui/editor/defaultGraph';
import {
    buildInterruptedStorageEntry,
    createSeedProject,
    installElectronBridge,
    readBridgeState,
    type ElectronBridgeSeed,
} from './support/fixtures';

function buildLauncherSeed(): ElectronBridgeSeed {
    const alpha = createSeedProject({ id: 'alpha', name: 'Alpha Lab' });
    const beta = createSeedProject({
        id: 'beta',
        name: 'Breakbeat Lab',
        graphs: [createInitialGraphDocument('breakbeat-graph', 'Breakbeat Graph', 0)],
        accentColor: '#ed6a5a',
    });

    return {
        bootstrap: { windowKind: 'launcher', projectId: null },
        projects: [alpha, beta],
    };
}

test('F12-S01 recent work search and open actions stay obvious', async ({ page }) => {
    await installElectronBridge(page, buildLauncherSeed());
    await page.goto('/');

    const recentSection = page.getByTestId('launcher-section-recent');
    await expect(recentSection).toBeVisible();
    await page.getByLabel('Search projects').fill('Breakbeat');
    await expect(recentSection.getByText('Breakbeat Lab')).toBeVisible();
    await expect(recentSection.getByText('Alpha Lab')).not.toBeVisible();

    await recentSection.getByRole('button', { name: 'Open Window' }).click();

    const state = await readBridgeState(page);
    expect(state.openProjectWindowCalls).toEqual(['beta']);
});

test('F12-S02 launcher templates create a project directly from the entry surface', async ({ page }) => {
    const seed = buildLauncherSeed();
    await installElectronBridge(page, seed);
    await page.goto('/');

    await page.getByRole('button', { name: 'Templates' }).click();
    await page.getByRole('button', { name: 'Medieval Strategy Longform' }).click();
    await page.getByRole('button', { name: 'Create From Template' }).click();

    await expect.poll(async () => {
        const state = await readBridgeState(page);
        return state.openProjectWindowCalls.length;
    }).toBe(1);
});

test('F12-S02 launcher import validates and opens the target project', async ({ page }) => {
    const seed = buildLauncherSeed();
    await installElectronBridge(page, seed);
    await page.goto('/');

    const importPatch = graphDocumentToPatch(createInitialGraphDocument('import-graph', 'Imported Graph', 0));
    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByLabel('Import patch file').setInputFiles({
        name: 'atmospheric-breakbeat-arc.patch.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(importPatch, null, 2)),
    });
    await page.selectOption('select', 'beta');
    await page.getByTestId('launcher-summary-panel').getByRole('button', { name: 'Import Patch' }).click();

    await expect.poll(async () => {
        const state = await readBridgeState(page);
        return state.openProjectWindowCalls;
    }).toContain('beta');
});

test('F12-S02 launcher recovery remains a first-class entry action', async ({ page }) => {
    const seed = buildLauncherSeed();
    seed.legacyWorkspace = {
        graphs: [createInitialGraphDocument('legacy-graph', 'Recovered Graph', 0)],
        activeGraphId: null,
        assets: [],
    };
    await installElectronBridge(page, seed);
    await page.goto('/');

    await page.getByRole('button', { name: 'Recover' }).click();
    await page.getByTestId('launcher-section-recover').getByRole('button', { name: 'Recover Legacy Workspace' }).click();

    await expect.poll(async () => {
        const state = await readBridgeState(page);
        return state.openProjectWindowCalls.length;
    }).toBe(1);
});

test('F12-S03 interrupted work stays visible and resumable at product entry', async ({ page }) => {
    const seed = buildLauncherSeed();
    const resume = {
        projectId: 'beta',
        kind: 'review',
        title: 'Review ready to commit',
        description: 'Changed files and commit framing are waiting in the review drawer.',
        actionLabel: 'Resume Review',
        severity: 'warning',
        updatedAt: Date.now(),
        railMode: 'review',
        phase: 'ready',
        graphId: seed.projects[1]?.snapshot.activeGraphId ?? null,
    };
    seed.localStorage = Object.fromEntries([
        buildInterruptedStorageEntry('beta', resume),
    ]);

    await installElectronBridge(page, seed);
    await page.goto('/');

    await page.getByRole('button', { name: 'Recover' }).click();
    await expect(page.getByTestId('launcher-resume-card')).toBeVisible();
    await page.getByTestId('launcher-summary-panel').getByRole('button', { name: 'Resume Review' }).click();

    await expect.poll(async () => {
        const state = await readBridgeState(page);
        return state.openProjectWindowCalls;
    }).toEqual(['beta']);
});
