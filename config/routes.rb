Rails.application.routes.draw do
  get 'rendersync/refetch', controller: 'render_sync/refetches', action: 'show'
end