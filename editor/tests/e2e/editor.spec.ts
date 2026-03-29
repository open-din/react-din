import { expect, test } from '@playwright/test';

test('persists graph edits and refreshes generated code', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Sources')).toBeVisible();
    await expect(page.getByPlaceholder('Graph name')).toBeVisible();

    await page.getByPlaceholder('Graph name').fill('Bass Lab');
    await page.getByPlaceholder('Graph name').press('Enter');

    await expect(page.locator('textarea')).toContainText('BassLab');

    await page.getByRole('button', { name: 'Voice Synth' }).click();
    await expect(page.getByText('Transport').first()).toBeVisible();
    await expect(page.getByText('Step Sequencer').first()).toBeVisible();
    await expect(page.locator('textarea')).toContainText('Sequencer');
    await expect(page.locator('textarea')).toContainText('Track');

    await page.getByLabel('Include Provider').check();
    await expect(page.locator('textarea')).toContainText('TransportProvider');

    await page.waitForTimeout(500);
    await page.reload();

    await expect(page.getByPlaceholder('Graph name')).toHaveValue('Bass Lab');
    await expect(page.locator('textarea')).toContainText('BassLab');
});

test('loads atmospheric sidechain template and emits expected codegen building blocks', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Atmospheric Sidechain' }).click();

    await expect(page.getByText('Transport').first()).toBeVisible();
    await expect(page.getByText('Piano Roll').first()).toBeVisible();
    await expect(page.getByText('Matrix Mixer').first()).toBeVisible();
    await expect(page.getByText('Compressor').first()).toBeVisible();
    await expect(page.getByText('Event Trigger').first()).toBeVisible();

    await expect(page.locator('textarea')).toContainText('Track id="pianoroll"');
    await expect(page.locator('textarea')).toContainText('EventTrigger');
    await expect(page.locator('textarea')).toContainText('MatrixMixer');
    await expect(page.locator('textarea')).toContainText('sidechainBusId');
});

test('loads atmospheric breakbeat arc template and emits the transport-driven arrangement', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Atmospheric Breakbeat Arc' }).click();

    await expect(page.getByText('Transport').first()).toBeVisible();
    await expect(page.getByText('Step Sequencer').first()).toBeVisible();
    await expect(page.getByText('Piano Roll').first()).toBeVisible();
    await expect(page.getByText('Compressor').first()).toBeVisible();
    await expect(page.getByText('Delay').first()).toBeVisible();

    await expect(page.locator('textarea')).toContainText('Track id="seq-kick"');
    await expect(page.locator('textarea')).toContainText('Track id="piano-pad"');
    await expect(page.locator('textarea')).toContainText('sidechainBusId="sc-gain-kick-compressor-pad"');
});

test('shows compatible handles during a drag and adds a connected node from the floating menu', async ({ page }) => {
    await page.goto('/');

    const oscOut = page.locator('.react-flow__handle[data-nodeid="osc_1"][data-handleid="out"]').first();
    const gainIn = page.locator('.react-flow__handle[data-nodeid="gain_1"][data-handleid="in"]').first();
    const canvas = page.getByTestId('rf__wrapper');

    await expect(oscOut).toBeVisible();
    await expect(gainIn).toBeVisible();

    const oscBox = await oscOut.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!oscBox || !canvasBox) {
        throw new Error('Expected drag handles and canvas to have bounding boxes');
    }

    await page.mouse.move(oscBox.x + (oscBox.width / 2), oscBox.y + (oscBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(oscBox.x + (oscBox.width / 2) + 36, oscBox.y + (oscBox.height / 2) + 12);

    await expect(page.locator('.react-flow__handle.connection-assist-handle[data-nodeid="gain_1"][data-handleid="in"]').first()).toBeVisible();

    await page.mouse.move(canvasBox.x + (canvasBox.width * 0.7), canvasBox.y + (canvasBox.height * 0.55));
    await page.mouse.up();

    await expect(page.getByLabel('Search nodes')).toBeVisible();

    await page.getByLabel('Search nodes').fill('filter');
    await page.getByRole('option', { name: /Filter -> In/i }).click();

    await expect(page.locator('.react-flow__node').filter({ hasText: 'Filter' })).toHaveCount(1);
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
});
