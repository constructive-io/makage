import { extractSubgraph } from '../src/index';
import graph from '../../../fixtures/graph.json';

it('image:cosmjs-roadmap-announcement', () => {
  const subgraph = extractSubgraph(graph, 'image:cosmjs-roadmap-announcement');
  expect(subgraph).toMatchSnapshot();
});