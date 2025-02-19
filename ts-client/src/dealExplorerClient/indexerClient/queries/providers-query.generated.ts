/* eslint-disable */
//@ts-nocheck
import * as Types from '../generated.types.js';

import { GraphQLClient } from 'graphql-request';
import type { RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ProvidersQueryQueryVariables = Types.Exact<{
  filters?: Types.InputMaybe<Types.Provider_Filter>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  limit?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  orderBy?: Types.InputMaybe<Types.Provider_OrderBy>;
  orderType?: Types.InputMaybe<Types.OrderDirection>;
}>;


export type ProvidersQueryQuery = { __typename?: 'Query', providers: Array<{ __typename?: 'Provider', id: string, name: string, createdAt: any, computeUnitsAvailable: number, computeUnitsTotal: number, approved: boolean, offers?: Array<{ __typename?: 'Offer', id: string, createdAt: any, pricePerEpoch: any, computeUnitsTotal?: number | null, computeUnitsAvailable?: number | null, paymentToken: { __typename?: 'Token', id: string, symbol: string, decimals: number }, effectors?: Array<{ __typename?: 'OfferToEffector', effector: { __typename?: 'Effector', id: string, description: string } }> | null, provider: { __typename?: 'Provider', id: string }, peers?: Array<{ __typename?: 'Peer', id: string }> | null }> | null }>, graphNetworks: Array<{ __typename?: 'GraphNetwork', providersRegisteredTotal: any }> };

export type ProviderOfProvidersQueryFragment = { __typename?: 'Provider', id: string, name: string, createdAt: any, computeUnitsAvailable: number, computeUnitsTotal: number, approved: boolean, offers?: Array<{ __typename?: 'Offer', id: string, createdAt: any, pricePerEpoch: any, computeUnitsTotal?: number | null, computeUnitsAvailable?: number | null, paymentToken: { __typename?: 'Token', id: string, symbol: string, decimals: number }, effectors?: Array<{ __typename?: 'OfferToEffector', effector: { __typename?: 'Effector', id: string, description: string } }> | null, provider: { __typename?: 'Provider', id: string }, peers?: Array<{ __typename?: 'Peer', id: string }> | null }> | null };

export type ProviderQueryQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type ProviderQueryQuery = { __typename?: 'Query', provider?: { __typename?: 'Provider', peerCount: number, id: string, name: string, createdAt: any, computeUnitsAvailable: number, computeUnitsTotal: number, approved: boolean } | null };

export type ProviderAbcFragment = { __typename?: 'Provider', id: string, name: string, createdAt: any, computeUnitsAvailable: number, computeUnitsTotal: number, approved: boolean };

export type ProvidersBasicOfferFragment = { __typename?: 'Offer', id: string, createdAt: any, pricePerEpoch: any, computeUnitsTotal?: number | null, computeUnitsAvailable?: number | null, paymentToken: { __typename?: 'Token', id: string, symbol: string, decimals: number }, effectors?: Array<{ __typename?: 'OfferToEffector', effector: { __typename?: 'Effector', id: string, description: string } }> | null, provider: { __typename?: 'Provider', id: string }, peers?: Array<{ __typename?: 'Peer', id: string }> | null };

export type EffectorBasicFragment = { __typename?: 'Effector', id: string, description: string };

export const ProviderAbcFragmentDoc = gql`
    fragment ProviderABC on Provider {
  id
  name
  createdAt
  computeUnitsAvailable
  computeUnitsTotal
  approved
}
    `;
export const EffectorBasicFragmentDoc = gql`
    fragment EffectorBasic on Effector {
  id
  description
}
    `;
export const ProvidersBasicOfferFragmentDoc = gql`
    fragment ProvidersBasicOffer on Offer {
  id
  createdAt
  pricePerEpoch
  paymentToken {
    id
    symbol
    decimals
  }
  computeUnitsTotal
  computeUnitsAvailable
  effectors {
    effector {
      ...EffectorBasic
    }
  }
  provider {
    id
  }
  peers(where: {deleted: false}) {
    id
  }
}
    ${EffectorBasicFragmentDoc}`;
export const ProviderOfProvidersQueryFragmentDoc = gql`
    fragment ProviderOfProvidersQuery on Provider {
  ...ProviderABC
  offers {
    ...ProvidersBasicOffer
  }
}
    ${ProviderAbcFragmentDoc}
${ProvidersBasicOfferFragmentDoc}`;
export const ProvidersQueryDocument = gql`
    query ProvidersQuery($filters: Provider_filter, $offset: Int, $limit: Int, $orderBy: Provider_orderBy, $orderType: OrderDirection) {
  providers(
    where: $filters
    first: $limit
    skip: $offset
    orderBy: $orderBy
    orderDirection: $orderType
  ) {
    ...ProviderOfProvidersQuery
  }
  graphNetworks(first: 1) {
    providersRegisteredTotal
  }
}
    ${ProviderOfProvidersQueryFragmentDoc}`;
export const ProviderQueryDocument = gql`
    query ProviderQuery($id: ID!) {
  provider(id: $id) {
    ...ProviderABC
    peerCount
  }
}
    ${ProviderAbcFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    ProvidersQuery(variables?: ProvidersQueryQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProvidersQueryQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProvidersQueryQuery>(ProvidersQueryDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'ProvidersQuery', 'query', variables);
    },
    ProviderQuery(variables: ProviderQueryQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProviderQueryQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProviderQueryQuery>(ProviderQueryDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'ProviderQuery', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
