export interface IDataSource {
  fetchProfile(params?: any): Promise<any>;
  fetchPosts(params?: any): Promise<any>;
  fetchComments(params?: any): Promise<any>;
}