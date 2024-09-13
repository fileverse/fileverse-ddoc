
import { Button, ButtonGroup, Divider, DynamicDropdown, LucideIcon, LucideIconProps } from '@fileverse/ui';
import { icons } from 'lucide-react';

type IconType = LucideIconProps['name'] | string;

type TemplateButtonProps = {
    label: string;
    icon: IconType;
    onClick: () => void;
}[];

const renderIcon = (icon: IconType, className?: string) => {
    if (typeof icon === 'string' && icons[icon as keyof typeof icons]) {
        return <LucideIcon name={icon as keyof typeof icons} className={className} />;
    } else if (typeof icon === 'string') {
        return <span className={className}>{icon}</span>;
    }
    return null;
};

const createTemplateButtons = (addTemplate: (template: string) => void): TemplateButtonProps => [
    {
        label: 'To-do',
        icon: 'ListChecks',
        onClick: () => addTemplate(`<h1>📋 To-do List</h1><table><thead><tr><th>Action item</th><th>Deadline</th></tr></thead><tbody><tr><td><ul data-type="taskList"><li data-type="taskItem">Add action item</li></ul></td></td><td>DD.MM.YYYY</td></tr><tr><td><ul data-type="taskList"><li data-type="taskItem">Add action item</li></ul></td></td><td>DD.MM.YYYY</td></tr><tr><td><ul data-type="taskList"><li data-type="taskItem">Add action item</li></ul></td></td><td>DD.MM.YYYY</td></tr></tbody></table>`),
    },
    {
        label: 'Breathe!',
        icon: '🧘‍♂️',
        onClick: () => addTemplate(
            `<h1 style="text-align: center">Take your time</h1><p style="text-align: center">Just breathe</p><img width="644px" src="https://i.imgur.com/Huou7Gh.gif"/><h3 style="text-align: center">Follow the breathing triangle, do it 5 times</h3><p style="text-align: center">When you are overwhelmed at work… or after handling a tough situation... when the market plumets.. when everything goes wrong.. or you're having a simple writer's block</p>`,
        ),
    },
];

const createMoreTemplates = (addTemplate: (template: string) => void): TemplateButtonProps => [
    {
        label: 'Meeting notes',
        icon: 'NotepadText',
        onClick: () => addTemplate(
            `<h1>[Date] | [Event]</h1><h3>Notes</h3><ul><li>Add note item</li><li>Add note item</li></ul><h3>Action items</h3><ul data-type="taskList"><li data-type="taskItem">Add action item</li><li data-type="taskItem">Add action item</li></ul>`,
        ),
    },
    {
        label: 'Intern notes',
        icon: '📝',
        onClick: () => addTemplate(`<h1>📝 Intern notes</h1><p>Source:</p><div data-action-node></div><div data-action-node></div><div data-type="columns"><div data-type="column"><strong>Person 1 quotes</strong></div><div data-type="column"><strong>Person 2 quotes</strong></div></div>`),
    },
    {
        label: 'Brainstorm',
        icon: 'Lightbulb',
        onClick: () => addTemplate(`<h1>💡 Brainstorming</h1><h2>[Issues & Goals]</h2><ul><li>First idea</li><li>Second idea</li><li>Third idea</li></ul><h2>Summaries:</h2><ul><li>Summary 1</li><li>Summary 2</li></ul>`),
    },
    {
        label: 'Pretend to work',
        icon: '🏄🏻‍♂️',
        onClick: () => addTemplate(`<h1><span style="font-family: Georgia, serif">Some ways to use ZK-SNARKs for privacy</span></h1><p>ZK-SNARKs are a powerful cryptographic tool, and an increasingly important part of the applications that people are building both in the blockchain space and beyond. But they are complicated, both in terms of <em>how they work</em>, and in terms of <em>how you can use them</em>.</p><h2>What does a ZK-SNARK do?</h2><p>Suppose that you have a public input x, a private input w, and a (public) function <span style="font-family: MJXc-TeX-math-Iw">f(x,w)→{True,False}</span> that performs some kind of verification on the inputs. With a ZK-SNARK, you can prove that you know an w such that <span style="font-family: MJXc-TeX-math-Iw">f(x,w)=True</span> for some given <span style="font-family: MJXc-TeX-math-Iw">f</span> and <span style="font-family: MJXc-TeX-math-Iw">x</span>, without revealing what <span style="font-family: MJXc-TeX-math-Iw">w</span> is. Additionally, the verifier can verify the proof much faster than it would take for them to compute <span style="font-family: MJXc-TeX-math-Iw">f(x,w)</span> themselves, even if they know <span style="font-family: MJXc-TeX-math-Iw">w</span>.</p><img width="644px" src="https://vitalik.eth.limo/images/using_snarks/definition.png"/><p>This gives the ZK-SNARK its two properties: <strong>privacy</strong> and <strong>scalability</strong>. As mentioned above, in this post our examples will focus on privacy.</p><h2>Holding centralized parties accountable</h2><p>Sometimes, you need to build a scheme that has a central "operator" of some kind. This could be for many reasons: sometimes it's for scalability, and sometimes it's for privacy - specifically, the privacy of data held by the operator.</p><p>The <a src="https://github.com/privacy-scaling-explorations/maci" target="_blank">MACI</a> coercion-resistant voting system, for example, requires voters to submit their votes on-chain encrypted to a secret key held by a central operator. The operator would decrypt all the votes on-chain, count them up, and reveal the final result, along with a ZK-SNARK proving that they did everything correctly. This extra complexity is necessary to ensure a strong privacy property (called <strong>coercion-resistance</strong>): that users cannot prove to others how they voted even if they wanted to.</p><p>Thanks to blockchains and ZK-SNARKs, the amount of trust in the operator can be kept very low. A malicious operator could still break coercion resistance, but because votes are published on the blockchain, the operator cannot cheat by censoring votes, and because the operator must provide a ZK-SNARK, they cannot cheat by mis-calculating the result.</p><h2>Combining ZK-SNARKs with MPC</h2><p>A more advanced use of ZK-SNARKs involves making proofs over computations where the inputs are split between two or more parties, and we don't want each party to learn the other parties' inputs. You can satisfy the privacy requirement with <a href="https://vitalik.eth.limo/general/2020/03/21/garbled.html" target="_blank">garbled circuits</a> in the 2-party case, and more complicated multi-party computation protocols in the N-party case. ZK-SNARKs can be combined with these protocols to do verifiable multi-party computation.</p><p>This could enable more advanced reputation systems where multiple participants can perform joint computations over their private inputs, it could enable privacy-preserving but authenticated data markets, and many other applications. That said, note that the math for doing this efficiently is still relatively in its infancy.</p><blockquote>Read the full article by <a href="https://vitalik.eth.limo/general/2021/01/26/snarks.html" target="_blank">Vitalik Buterin</a></blockquote>`),
    },
];

const renderTemplateButtons = (
    templateButtons: TemplateButtonProps,
    moreTemplates: TemplateButtonProps,
    visibleTemplateCount: number,
    expandAllTemplates: () => void
) => (
    <ButtonGroup className="template-buttons space-x-0 gap-2 absolute top-8 left-0 md:!left-[unset] md:-translate-x-[60%] md:-translate-y-1 md:!right-0 md:!top-0 z-50">
        {templateButtons.map((button, index) => (
            <Button
                key={index}
                onClick={button.onClick}
                variant={'ghost'}
                className='gap-2 color-bg-default-hover text-body-sm color-text-default rounded-lg hover:brightness-95 transition-all min-w-fit'
            >
                {renderIcon(button.icon)}
                <span>{button.label}</span>
            </Button>
        ))}
        <DynamicDropdown
            key={'More Templates'}
            align='end'
            sideOffset={10}
            anchorTrigger={
                <Button
                    variant={'ghost'}
                    className='gap-2 color-bg-default-hover text-body-sm color-text-default rounded-lg hover:brightness-95 transition-all w-full min-w-0 !p-[10px]'
                >
                    <LucideIcon name={'Ellipsis'} className='color-text-default' />
                </Button>
            }
            content={
                <div className="flex flex-col gap-1 p-2 w-[12rem]">
                    <div className='max-h-44 overflow-auto gap-1 flex flex-col'>
                        {moreTemplates.slice(0, visibleTemplateCount).map((button, index) => (
                            <Button
                                key={index}
                                onClick={button.onClick}
                                variant={'ghost'}
                                className='justify-start gap-2 text-body-sm color-text-default min-w-fit px-2 rounded-lg'
                            >
                                {renderIcon(button.icon)}
                                <span>{button.label}</span>
                            </Button>
                        ))}
                    </div>
                    <Divider className='w-full !border-t-[1px]' />
                    <Button
                        variant={'ghost'}
                        className='justify-start gap-2 text-body-sm color-text-default min-w-fit px-2 rounded-lg'
                        onClick={expandAllTemplates}
                    >
                        <LucideIcon name={'LayoutTemplate'} />
                        <span>All templates</span>
                    </Button>
                </div>
            }
        />
    </ButtonGroup>
);

export { renderIcon, createTemplateButtons, createMoreTemplates, renderTemplateButtons };