import preview from '../.storybook/preview';
import { Bands } from './Bands';

const meta = preview.meta({
  title: 'Example/Bands',
  component: Bands,
  parameters: { layout: 'fullscreen' },
});

export const Default = meta.story();
