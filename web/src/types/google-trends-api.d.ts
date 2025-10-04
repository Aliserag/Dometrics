declare module 'google-trends-api' {
  export function interestOverTime(options: any): Promise<string>
  export function interestByRegion(options: any): Promise<string>
  export function relatedQueries(options: any): Promise<string>
  export function relatedTopics(options: any): Promise<string>
}
