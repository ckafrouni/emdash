import { observer } from 'mobx-react-lite';
import { useWorkspaceViewModel } from '@renderer/features/tasks/task-view-context';
import { ShowHide } from '@renderer/lib/ui/show-hide';
import { SidebarConversationsList } from '../conversations/sidebar-conversations-list';
import { ChangesPanel } from '../diff-view/changes-panel/changes-panel';
import { EditorFileTree } from '../editor/editor-file-tree';

export const TaskSidebar = observer(function TaskSidebar() {
  const taskView = useWorkspaceViewModel();
  const activeTab = taskView.sidebarTab;
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ShowHide visible={activeTab === 'conversations'}>
        <SidebarConversationsList />
      </ShowHide>
      <ShowHide visible={activeTab === 'changes'}>
        <ChangesPanel />
      </ShowHide>
      <ShowHide visible={activeTab === 'files'}>
        <EditorFileTree />
      </ShowHide>
    </div>
  );
});
