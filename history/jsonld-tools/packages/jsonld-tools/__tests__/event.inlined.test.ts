import { extractSubgraph, inlineReferences } from '../src/index';
import graph from '../../../fixtures/graph.json';

it('event:osmocon-2023-paris expanded with inlined references', async () => {
  // Extract the subgraph containing the event and all its references
  const subgraph = extractSubgraph(graph, 'event:osmocon-2023-paris');
  
  // Manually inline all @id references with their full entity data
  const inlined = inlineReferences(subgraph, 'event:osmocon-2023-paris');
  
  expect(inlined).toMatchSnapshot();
});
